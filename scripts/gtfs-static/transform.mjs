// Transforms LTC's static GTFS feed (https://www.londontransit.ca/gtfsfeed/google_transit.zip)
// into the simplified stops.json / routes.json shape consumed by the client
// (see client/src/components/MarkersLines/StopMarkers.jsx and Routes.jsx).
//
// GTFS field mapping, reverse-engineered from the existing committed files:
//   stop.id        <- stops.txt stop_code (numeric; this is what the LTC realtime
//                      feed reports as a vehicle's current/next stop_id, see
//                      server/src/state.js)
//   stop.stop_id   <- stops.txt stop_id (alphanumeric GTFS key)
//   stop.name      <- stops.txt stop_name, with the trailing " - #<stop_code>"
//                      suffix stripped
//   stop.routes    <- route_short_name for every route serving that stop (via
//                      stop_times -> trips), with any leading zero stripped and,
//                      best-effort, a branch letter (e.g. "13A") appended when the
//                      majority of trip_headsigns for that stop+route agree on one
//   route.id       <- routes.txt route_short_name, verbatim
//   route.segments <- one polyline per distinct shape_id used by the route's trips

import fs from 'node:fs';
import path from 'node:path';

// Splits one CSV line into fields, honoring RFC 4180 double-quoted fields that
// may themselves contain commas or escaped ("") quotes. LTC's feed currently
// quotes nothing, but a single quoted stop_name/trip_headsign in a future feed
// would silently shift every column past it under a naive split(',').
function parseCsvLine(line) {
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
            if (c === '"') {
                if (line[i + 1] === '"') { field += '"'; i++; } // escaped quote
                else inQuotes = false;
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            fields.push(field);
            field = '';
        } else {
            field += c;
        }
    }
    fields.push(field);
    return fields;
}

function parseCsv(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
    const headers = parseCsvLine(lines[0]).map((h) => h.trim());

    const rows = new Array(lines.length - 1);
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = (cols[j] ?? '').trim();
        }
        rows[i - 1] = row;
    }
    return rows;
}

// Matches a leading "<digits><letter>" token in a trip_headsign, e.g. "13A" in
// "13A White Oaks Mall via Westminster Park".
const BRANCH_LABEL_RE = /^(\d+)([A-Za-z])\b/;

function stripLeadingZero(routeShortName) {
    return routeShortName.replace(/^0+(?=\d)/, '');
}

function buildRoutes(routesCsv, tripsCsv, shapesCsv) {
    const shapePoints = new Map(); // shape_id -> [{seq, lat, lon}]
    for (const row of shapesCsv) {
        if (!row.shape_id) continue;
        if (!shapePoints.has(row.shape_id)) shapePoints.set(row.shape_id, []);
        shapePoints.get(row.shape_id).push({
            seq: Number(row.shape_pt_sequence),
            lat: Number(row.shape_pt_lat),
            lon: Number(row.shape_pt_lon),
        });
    }
    for (const points of shapePoints.values()) {
        points.sort((a, b) => a.seq - b.seq);
    }

    const shapeIdsByRoute = new Map(); // route_id -> Set(shape_id)
    for (const trip of tripsCsv) {
        if (!trip.shape_id) continue;
        if (!shapeIdsByRoute.has(trip.route_id)) shapeIdsByRoute.set(trip.route_id, new Set());
        shapeIdsByRoute.get(trip.route_id).add(trip.shape_id);
    }

    return routesCsv
        .map((route) => {
            const shapeIds = [...(shapeIdsByRoute.get(route.route_id) ?? [])].sort();
            const segments = shapeIds
                .map((shapeId) => shapePoints.get(shapeId))
                .filter((points) => points && points.length > 0)
                .map((points) => points.map((p) => [p.lat, p.lon]));
            return { id: route.route_short_name, segments };
        })
        .filter((route) => route.segments.length > 0)
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

// Builds, for every stop, the set of route "labels" serving it (e.g. "13A", "7"),
// by joining stop_times -> trips -> routes. stop_times.txt runs 300k+ rows, so
// it's streamed and only the two needed columns are picked out per line rather
// than materializing it via parseCsv's row-of-objects form.
function buildStops(stopsCsv, tripsCsv, routeShortNameByRouteId, gtfsDir) {
    const tripById = new Map(tripsCsv.map((t) => [t.trip_id, t]));

    const headsignCounts = new Map(); // `${stop_id}|${route_id}` -> Map(headsign -> count)
    const stopTimesRaw = fs.readFileSync(path.join(gtfsDir, 'stop_times.txt'), 'utf8');
    const stLines = stopTimesRaw.split(/\r?\n/);
    const stHeader = parseCsvLine(stLines[0]).map((h) => h.trim());
    const tripIdx = stHeader.indexOf('trip_id');
    const stopIdx = stHeader.indexOf('stop_id');

    for (let i = 1; i < stLines.length; i++) {
        const line = stLines[i];
        if (!line) continue;
        const cols = parseCsvLine(line);
        const stopId = cols[stopIdx]?.trim();
        const trip = tripById.get(cols[tripIdx]?.trim());
        if (!stopId || !trip) continue;

        const key = `${stopId}|${trip.route_id}`;
        if (!headsignCounts.has(key)) headsignCounts.set(key, new Map());
        const counts = headsignCounts.get(key);
        counts.set(trip.trip_headsign, (counts.get(trip.trip_headsign) ?? 0) + 1);
    }

    const routeIdsByStop = new Map(); // stop_id -> Set(route_id)
    for (const key of headsignCounts.keys()) {
        const [stopId, routeId] = key.split('|');
        if (!routeIdsByStop.has(stopId)) routeIdsByStop.set(stopId, new Set());
        routeIdsByStop.get(stopId).add(routeId);
    }

    function branchLabel(stopId, routeId, base) {
        const counts = headsignCounts.get(`${stopId}|${routeId}`);
        if (!counts) return base;

        let bestHeadsign = null;
        let bestCount = -1;
        for (const [headsign, count] of counts) {
            if (count > bestCount) {
                bestHeadsign = headsign;
                bestCount = count;
            }
        }

        const match = bestHeadsign?.match(BRANCH_LABEL_RE);
        if (match && stripLeadingZero(match[1]) === base) {
            return `${base}${match[2].toUpperCase()}`;
        }
        return base;
    }

    return stopsCsv
        .filter((stop) => stop.stop_code)
        .map((stop) => {
            const routeIds = [...(routeIdsByStop.get(stop.stop_id) ?? [])];
            const labels = routeIds
                .map((routeId) => {
                    const shortName = routeShortNameByRouteId.get(routeId);
                    if (!shortName) return null;
                    return branchLabel(stop.stop_id, routeId, stripLeadingZero(shortName));
                })
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

            return {
                id: Number(stop.stop_code),
                stop_id: stop.stop_id,
                name: stop.stop_name.replace(/\s*-\s*#\d+\s*$/, ''),
                coordinates: [Number(stop.stop_lat), Number(stop.stop_lon)],
                routes: labels,
            };
        })
        .sort((a, b) => a.id - b.id);
}

export function transformGtfsStatic(gtfsDir) {
    const routesCsv = parseCsv(path.join(gtfsDir, 'routes.txt'));
    const tripsCsv = parseCsv(path.join(gtfsDir, 'trips.txt'));
    const shapesCsv = parseCsv(path.join(gtfsDir, 'shapes.txt'));
    const stopsCsv = parseCsv(path.join(gtfsDir, 'stops.txt'));

    const routeShortNameByRouteId = new Map(routesCsv.map((r) => [r.route_id, r.route_short_name]));

    const routes = buildRoutes(routesCsv, tripsCsv, shapesCsv);
    const stops = buildStops(stopsCsv, tripsCsv, routeShortNameByRouteId, gtfsDir);

    return { stops, routes };
}
