import { AbortController } from 'abort-controller';
import fetch from 'node-fetch';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { VEHICLE_URL, TRIP_UPDATE_URL, UPDATE_PERIOD_SEC } from '../config.js';
import { eventEmitter, latestVehicleData, latestArrivalData, stopIdMap } from '../state.js';
import { hasSubscriptions, waitForSubscription, wakeIdleWaiters } from './activityService.js';

const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;

let isShuttingDown = false;
let lastVehicleTimestamp = null;
let lastTripTimestamp = null;
let lastSuccessfulUpdateTime = Date.now();
let watchdogTimer = null;

async function safeFetch(url, timeout = 5000, headers = undefined) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, { signal: controller.signal, headers });
        clearTimeout(timer);
        return res;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

// Per-URL conditional-request state: the validators LTC sent with the last 200,
// plus the feed they decoded to. The decoded feed has to be kept because a cycle
// where only one of the two feeds changed still needs both to be processed
// together — reusing the cached one is what makes the 304 free rather than
// forcing an unconditional refetch of its partner.
const feedCache = new Map();

// Fetch a GTFS-Realtime protobuf feed and decode it into a FeedMessage.
//
// Asks LTC whether anything actually changed first. The poller retries within a
// cycle until the feed's timestamp advances, and LTC answers an unchanged feed
// with an empty 304, so those retries cost nothing instead of re-downloading a
// multi-megabyte body that we already hold.
//
// Returns { feed, changed } — `changed` is false when the response was a 304 and
// `feed` is therefore the previously decoded one.
export async function fetchFeed(url, timeout = 7000) {
    const cached = feedCache.get(url);

    const headers = {};
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

    const res = await safeFetch(url, timeout, headers);

    if (res.status === 304 && cached) {
        return { feed: cached.feed, changed: false };
    }

    // Without this an error page would be handed to the protobuf decoder, which
    // fails far less legibly than the status code does. (304 is not `ok`, so this
    // has to stay below the check above.)
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);

    const buffer = await res.arrayBuffer();
    const feed = FeedMessage.decode(new Uint8Array(buffer));

    feedCache.set(url, {
        etag: res.headers.get('etag'),
        lastModified: res.headers.get('last-modified'),
        feed,
    });

    return { feed, changed: true };
}

// protobuf 64-bit fields (feed/arrival timestamps) decode to Long objects, which
// GraphQL's Int serializer would choke on. Long stringifies to its decimal value,
// so Number() converts it losslessly at these magnitudes.
function toNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
}

// Unset proto2 fields read back as their type default rather than as absent, so
// a bus that never reported occupancy would look like a confidently empty bus.
// Only an own property means the feed actually carried a value.
function hasOwn(obj, key) {
    return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

// Accepts decoded GTFS-Realtime FeedMessages (see fetchFeed), so field names are
// the protobuf camelCase spelling rather than the snake_case of LTC's JSON export.
export async function handleData(vehicleFeed, tripFeed) {
    const nextVehicleData = new Map();
    const nextArrivalMap = new Map();

    const vehicleFeedTimestamp = toNumber(vehicleFeed.header?.timestamp) ?? 0;
    const tripFeedTimestamp = toNumber(tripFeed.header?.timestamp) ?? 0;

    // Build a lookup map for trip updates by tripId
    const tripUpdateMap = new Map();
    for (const entity of tripFeed.entity) {
        if (entity.tripUpdate?.trip?.tripId) {
            tripUpdateMap.set(entity.tripUpdate.trip.tripId, entity.tripUpdate);
        }
    }

    for (const entity of vehicleFeed.entity) {
        const v = entity.vehicle;
        if (!v?.trip?.routeId || !v?.position?.latitude || !v?.position?.longitude) continue;

        // Find the next stopId for this vehicle
        let nextStopId = null;
        const tripId = v.trip.tripId;
        const currentStopId = v.stopId;
        const currentStatus = v.currentStatus;

        // Try mapping the numeric stop_id to alphanumeric code
        let mappedStopId = currentStopId;
        if (stopIdMap.has(currentStopId)) {
            mappedStopId = stopIdMap.get(currentStopId);
        }

        const tripUpdate = tripUpdateMap.get(tripId);

        // Logic based on status
        // 0 = INCOMING_AT, 1 = STOPPED_AT, 2 = IN_TRANSIT_TO
        // If status is 2 (IN_TRANSIT_TO) or 0 (INCOMING_AT), the provided stop_id is the NEXT stop.
        if (currentStatus === 2 || currentStatus === 0) {
            nextStopId = mappedStopId;
        } 
        // If stopped at a stop (1), proceed to next stop in sequence
        else if (currentStatus === 1 && tripUpdate && Array.isArray(tripUpdate.stopTimeUpdate)) {
            // Find current stop in updates
            const currentIndex = tripUpdate.stopTimeUpdate.findIndex(s => s.stopId === mappedStopId);
            if (currentIndex !== -1 && currentIndex + 1 < tripUpdate.stopTimeUpdate.length) {
                nextStopId = tripUpdate.stopTimeUpdate[currentIndex + 1].stopId;
            } else {
                // Checking if the first update stop is different from current stop
                if (tripUpdate.stopTimeUpdate.length > 0) {
                    const firstUpdate = tripUpdate.stopTimeUpdate[0];
                    if (firstUpdate.stopId !== mappedStopId) {
                        nextStopId = firstUpdate.stopId;
                    }
                }
            }
        }
        
        if (!nextStopId && mappedStopId) {
            nextStopId = mappedStopId;
        }

        // Fallback: if not found, use na as marker
        if (!nextStopId) nextStopId = "na";

        const payload = {
            RouteId: v.trip.routeId,
            Latitude: v.position.latitude,
            Longitude: v.position.longitude,
            Destination: nextStopId,
            VehicleId: v.vehicle.id,
            Bearing: v.position.bearing,
            timestamp: vehicleFeedTimestamp,
            // Reported as null when the feed omits it — see hasOwn: the protobuf
            // default would otherwise claim an unreported bus is empty.
            occupancy_status: hasOwn(v, 'occupancyStatus') ? v.occupancyStatus : null,
            occupancy_percentage: hasOwn(v, 'occupancyPercentage') ? v.occupancyPercentage : null,
        };

        if (!nextVehicleData.has(payload.RouteId)) {
            nextVehicleData.set(payload.RouteId, []);
        }
        nextVehicleData.get(payload.RouteId).push(payload);
    }

    // Emit batch updates per route
    for (const [routeId, vehicles] of nextVehicleData) {
        eventEmitter.emit(`VEHICLE_UPDATE_${routeId}`, vehicles);
    }


    // Arrivals
    const groupedArrivals = new Map(); // stopId -> routeId -> StopArrival[]
    const emittedArrivals = new Set();

    // Parse trips
    for (const entity of tripFeed.entity) {

        // Validate entity structure
        const tripUpdate = entity.tripUpdate;
        if (!tripUpdate?.trip?.tripId || !tripUpdate?.stopTimeUpdate) continue;

        const tripId = tripUpdate.trip.tripId;
        const routeId = tripUpdate.trip.routeId;

        for (const stu of tripUpdate.stopTimeUpdate) {
            const stopId = stu.stopId;
            const arrival = toNumber(stu.arrival?.time);
            const delay = stu.arrival?.delay ?? 0;

            if (!stopId || !arrival) continue;

            const uniqueKey = `${tripId}_${stopId}`;
            if (emittedArrivals.has(uniqueKey)) continue;
            emittedArrivals.add(uniqueKey);

            const stopArrivalPayload = {
                stopId,
                routeId,
                tripId,
                arrivalTime: arrival,
                delaySeconds: delay,
                timestamp: tripFeedTimestamp, // falls back to 0 if dne
            };

            if (!groupedArrivals.has(stopId)) {
                groupedArrivals.set(stopId, new Map());
            }

            const routesMap = groupedArrivals.get(stopId);
            if (!routesMap.has(routeId)) {
                routesMap.set(routeId, []);
            }

            routesMap.get(routeId).push(stopArrivalPayload);
        }
    }

    for (const [stopId, routeMap] of groupedArrivals.entries()) {
        const arrivalsToEmit = [];

        for (const [routeId, arrivals] of routeMap.entries()) {
            // Sort by soonest arrival
            arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);

            // Take top 3
            const topArrivals = arrivals.slice(0, 3);
            arrivalsToEmit.push(...topArrivals);
        }

        // Store in cache
        nextArrivalMap.set(stopId, arrivalsToEmit);

        // Emit batch once per stop
        eventEmitter.emit(`VEHICLE_UPDATE_STOP_${stopId}`, arrivalsToEmit);
    }

    // Refresh global state atomically
    latestVehicleData.clear();
    for (const [key, value] of nextVehicleData) {
        latestVehicleData.set(key, value);
    }

    latestArrivalData.clear();
    for (const [key, value] of nextArrivalMap) {
        latestArrivalData.set(key, value);
    }
}

export async function predictivePollingLoop() {
    while (!isShuttingDown) {
        // Nobody is watching, so there is nobody to serve the data to. Park until
        // a client subscribes rather than paying for feeds that go straight in the
        // bin (see activityService for why this is worth doing).
        if (!hasSubscriptions()) {
            console.log('No active subscriptions — pausing polling');
            // Clearing these makes the first poll after resume fire immediately
            // instead of waiting out a schedule derived from stale timestamps.
            lastVehicleTimestamp = null;
            lastTripTimestamp = null;

            await waitForSubscription();
            if (isShuttingDown) break;

            // The idle gap is not a stall, so don't let the watchdog treat it as one.
            lastSuccessfulUpdateTime = Date.now();
            console.log('Subscription opened — resuming polling');
        }

        if (lastVehicleTimestamp === null) {
            // First poll — no delay
            console.log("Initial fetch...");
        } else {
            const now = Math.floor(Date.now() / 1000);
            const nextExpected = lastVehicleTimestamp + UPDATE_PERIOD_SEC;
            const delay = Math.max(0, (nextExpected - now) * 1000 + 200); // 0.2s late
            console.log(`Waiting ${delay}ms for next expected update at ${nextExpected}`);
            await new Promise(res => setTimeout(res, delay));
        }

        if (isShuttingDown) break;

        // The wait above can outlive the last subscriber. Re-check before spending
        // a fetch, otherwise every disconnect costs one more full feed download
        // before the loop comes back around and notices nobody is listening.
        if (!hasSubscriptions()) continue;

        let updated = false;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const [vehicleResult, tripResult] = await Promise.all([
                    fetchFeed(VEHICLE_URL, 7000),
                    fetchFeed(TRIP_UPDATE_URL, 7000),
                ]);

                // An unchanged feed comes back as the cached one, so its header
                // timestamp is unchanged too and the comparison below already
                // treats it as "nothing new" without any extra branching.
                const vehicleFeed = vehicleResult.feed;
                const tripFeed = tripResult.feed;

                const vehicleTimestamp = toNumber(vehicleFeed.header?.timestamp) ?? 0;
                const tripTimestamp = toNumber(tripFeed.header?.timestamp) ?? 0;
                const now = Math.floor(Date.now() / 1000);

                const cacheNote = (result) => (result.changed ? '' : ' (304)');
                console.log(
                    `[${now}] Attempt ${attempt + 1}, ` +
                    `Vehicle TS: ${vehicleTimestamp}${cacheNote(vehicleResult)}, ` +
                    `Trip TS: ${tripTimestamp}${cacheNote(tripResult)}`
                );

                const isNewVehicle = vehicleTimestamp && vehicleTimestamp !== lastVehicleTimestamp;
                const isNewTrip = tripTimestamp && tripTimestamp !== lastTripTimestamp;

                const shouldUpdate = isNewVehicle || isNewTrip;
                if (shouldUpdate) {
                    lastVehicleTimestamp = vehicleTimestamp;
                    lastTripTimestamp = tripTimestamp;
                    await handleData(vehicleFeed, tripFeed);
                    lastSuccessfulUpdateTime = Date.now();
                    updated = true;
                    break;
                }
            } catch (err) {
                console.error('Polling error:', err.message);
                // Allow retrys on errors
                if (attempt === 2) break;
            }

            // Retry after 1 second
            await new Promise(res => setTimeout(res, 1000));
        }

        if (!updated) {
            console.log(`[${new Date().toISOString()}] No new data detected this cycle.`);
        }
    }
}

export function shutdownPolling() {
    isShuttingDown = true;
    // A loop parked in waitForSubscription() would otherwise never observe the
    // flag, and the watchdog interval would hold the event loop open.
    wakeIdleWaiters();
    if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
    }
}

export function startWatchdog() {
    // Force a reset if the polling loop is stuck
    watchdogTimer = setInterval(() => {
        // While idle there is deliberately no polling, so an old timestamp is
        // expected rather than evidence of a stall.
        if (!hasSubscriptions()) return;

        if (Date.now() - lastSuccessfulUpdateTime > 60000) {
            console.warn('Watchdog: No successful update in 60s, resetting timestamps');
            lastVehicleTimestamp = null;
            lastTripTimestamp = null;
        }
    }, 30000);
}
