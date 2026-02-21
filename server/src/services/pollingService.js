import { AbortController } from 'abort-controller';
import fetch from 'node-fetch';
import { VEHICLE_URL, TRIP_UPDATE_URL, UPDATE_PERIOD_SEC } from '../config.js';
import { eventEmitter, latestVehicleData, latestArrivalData, stopIdMap } from '../state.js';

let isShuttingDown = false;
let lastVehicleTimestamp = null;
let lastTripTimestamp = null;
let lastSuccessfulUpdateTime = Date.now();

async function safeFetch(url, timeout = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        return res;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

async function handleData(vehicleJson, tripJson) {
    const nextVehicleData = new Map();
    const nextArrivalMap = new Map();

    // Build a lookup map for trip updates by trip_id
    const tripUpdateMap = new Map();
    for (const entity of tripJson.entity) {
        if (entity.trip_update?.trip?.trip_id) {
            tripUpdateMap.set(entity.trip_update.trip.trip_id, entity.trip_update);
        }
    }

    for (const entity of vehicleJson.entity) {
        const v = entity.vehicle;
        if (!v?.trip?.route_id || !v?.position?.latitude || !v?.position?.longitude) continue;

        // Find the next stop_id for this vehicle
        let nextStopId = null;
        const tripId = v.trip.trip_id;
        const currentStopId = v.stop_id;
        const currentStatus = v.current_status;
        
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
        else if (currentStatus === 1 && tripUpdate && Array.isArray(tripUpdate.stop_time_update)) {
            // Find current stop in updates
            const currentIndex = tripUpdate.stop_time_update.findIndex(s => s.stop_id === mappedStopId);
            if (currentIndex !== -1 && currentIndex + 1 < tripUpdate.stop_time_update.length) {
                nextStopId = tripUpdate.stop_time_update[currentIndex + 1].stop_id;
            } else {
                // Checking if the first update stop is different from current stop
                if (tripUpdate.stop_time_update.length > 0) {
                    const firstUpdate = tripUpdate.stop_time_update[0];
                    if (firstUpdate.stop_id !== mappedStopId) {
                        nextStopId = firstUpdate.stop_id;
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
            RouteId: v.trip.route_id,
            Latitude: v.position.latitude,
            Longitude: v.position.longitude,
            Destination: nextStopId,
            VehicleId: v.vehicle.id,
            Bearing: v.position.bearing,
            timestamp: vehicleJson.header?.timestamp ?? 0, 
            occupancy_status: v.occupancy_status ?? null,
            occupancy_percentage: v.occupancy_percentage ?? null,
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
    for (const entity of tripJson.entity) {

        // Validate entity structure
        const tripUpdate = entity.trip_update;
        if (!tripUpdate?.trip?.trip_id || !tripUpdate?.stop_time_update) continue;

        const tripId = tripUpdate.trip.trip_id;
        const routeId = tripUpdate.trip.route_id;

        for (const stu of tripUpdate.stop_time_update) {
            const stopId = stu.stop_id;
            const arrival = stu.arrival?.time;
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
                timestamp: tripJson.header?.timestamp ?? 0, // fall back to 0 if dne
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

        let updated = false;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const [vehicleRes, tripRes] = await Promise.all([
                    safeFetch(VEHICLE_URL, 7000),
                    safeFetch(TRIP_UPDATE_URL, 7000),
                ]);

                const [vehicleJson, tripJson] = await Promise.all([
                    vehicleRes.json(),
                    tripRes.json(),
                ]);

                const vehicleTimestamp = Number(vehicleJson.header?.timestamp ?? 0);
                const tripTimestamp = Number(tripJson.header?.timestamp ?? 0);
                const now = Math.floor(Date.now() / 1000);

                console.log(`[${now}] Attempt ${attempt + 1}, Vehicle TS: ${vehicleTimestamp}, Trip TS: ${tripTimestamp}`);

                const isNewVehicle = vehicleTimestamp && vehicleTimestamp !== lastVehicleTimestamp;
                const isNewTrip = tripTimestamp && tripTimestamp !== lastTripTimestamp;

                const shouldUpdate = isNewVehicle || isNewTrip;
                if (shouldUpdate) {
                    lastVehicleTimestamp = vehicleTimestamp;
                    lastTripTimestamp = tripTimestamp;
                    await handleData(vehicleJson, tripJson);
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
}

export function startWatchdog() {
    // Force a reset if the polling loop is stuck
    setInterval(() => {
        if (Date.now() - lastSuccessfulUpdateTime > 60000) {
            console.warn('Watchdog: No successful update in 60s, resetting timestamps');
            lastVehicleTimestamp = null;
            lastTripTimestamp = null;
        }
    }, 30000);
}
