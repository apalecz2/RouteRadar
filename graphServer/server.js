import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import fetch from 'node-fetch';
import cors from 'cors';
import { EventEmitter } from 'events';
import { AbortController } from 'abort-controller';
import fs from 'fs';
import path from 'path';

let isShuttingDown = false;

const VEHICLE_URL = 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.json';
const TRIP_UPDATE_URL = 'http://gtfs.ltconline.ca/TripUpdate/TripUpdates.json';

const VEHICLE_UPDATE = 'VEHICLE_UPDATE';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load stop mapping
const stopsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'client', 'public', 'stops.json'), 'utf8')
);
const stopIdMap = new Map();
for (const stop of stopsData) {
    if (stop.id && stop.stop_id) {
        stopIdMap.set(String(stop.id), stop.stop_id);
    }
}
console.log(`Loaded ${stopIdMap.size} stops for ID mapping`);

const eventEmitter = new EventEmitter();
// Increase max listeners to handle rapid subscription changes
eventEmitter.setMaxListeners(100);

// Separate cleanup system for EventEmitter listeners
const subscriptionCleanup = {
    activeSubscriptions: new Map(), // track active subscriptions
    cleanupInterval: null,

    // Register a subscription for cleanup tracking
    registerSubscription: function (subscriptionId, eventName, handler) {
        this.activeSubscriptions.set(subscriptionId, {
            eventName,
            handler,
            timestamp: Date.now()
        });
    },

    // Unregister a subscription from cleanup tracking
    unregisterSubscription: function (subscriptionId) {
        this.activeSubscriptions.delete(subscriptionId);
    },

    // Force cleanup of orphaned listeners
    cleanupOrphanedListeners: function () {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes

        for (const [subscriptionId, subscription] of this.activeSubscriptions.entries()) {
            if (now - subscription.timestamp > maxAge) {
                console.log(`Cleaning up stale subscription: ${subscriptionId}`);
                eventEmitter.off(subscription.eventName, subscription.handler);
                this.activeSubscriptions.delete(subscriptionId);
            }
        }

        // Log current listener counts for debugging
        const eventNames = eventEmitter.eventNames();
        eventNames.forEach(eventName => {
            const count = eventEmitter.listenerCount(eventName);
            if (count > 5) {
                console.log(`Warning: ${eventName} has ${count} listeners`);
            }
        });
    },

    // Immediate cleanup for specific event
    cleanupEventListeners: function (eventName) {
        const count = eventEmitter.listenerCount(eventName);
        if (count > 10) {
            console.log(`Cleaning up ${count} listeners for ${eventName}`);
            // Remove all listeners for this event and let them be re-added
            eventEmitter.removeAllListeners(eventName);
        }
    },

    // Start the cleanup system
    start: function () {
        this.cleanupInterval = setInterval(() => {
            this.cleanupOrphanedListeners();
        }, 30000); // Run every 30 seconds
    },

    // Stop the cleanup system
    stop: function () {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
};

const latestVehicleData = new Map(); // Key: routeId, Value: Array of vehicle objects
const latestArrivalData = new Map();

const typeDefs = `
    type Vehicle {
        RouteId: String
        Latitude: Float
        Longitude: Float
        Destination: String
        VehicleId: String
        Bearing: Float
        timestamp: Int!
        occupancy_status: Int
        occupancy_percentage: Int
    }
    
    type StopArrival {
        stopId: String!
        routeId: String!
        tripId: String!
        arrivalTime: Int!
        delaySeconds: Int
        timestamp: Int!
    }

    type Query {
        _empty: String
    }

    type Subscription {
        vehicleUpdates(routeId: String!): Vehicle
        stopUpdates(stopId: String!): [StopArrival!]!
    }
`;

const resolvers = {
    Subscription: {
        vehicleUpdates: {
            subscribe: async function* (_, { routeId }) {
                const eventName = `${VEHICLE_UPDATE}_${routeId}`;
                const queue = [];
                const subscriptionId = `vehicle_${routeId}_${Date.now()}`;

                // Check and cleanup if too many listeners exist
                subscriptionCleanup.cleanupEventListeners(eventName);

                const handler = (payload) => queue.push(payload);
                eventEmitter.on(eventName, handler);

                // Register with cleanup system
                subscriptionCleanup.registerSubscription(subscriptionId, eventName, handler);

                // Immediately enqueue latest data for this routeId
                if (latestVehicleData.has(routeId)) {
                    for (const vehicle of latestVehicleData.get(routeId)) {
                        queue.push(vehicle);
                    }
                }

                try {
                    while (true) {
                        if (queue.length === 0) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            continue;
                        }

                        yield { vehicleUpdates: queue.shift() };
                    }
                } finally {
                    eventEmitter.off(eventName, handler);
                    subscriptionCleanup.unregisterSubscription(subscriptionId);
                }
            },
        },
        stopUpdates: {
            subscribe: async function* (_, { stopId }) {
                const queue = [];
                const subscriptionId = `stop_${stopId}_${Date.now()}`;
                const eventName = `${VEHICLE_UPDATE}_STOP_${stopId}`;

                // Check and cleanup if too many listeners exist
                subscriptionCleanup.cleanupEventListeners(eventName);

                const handler = (payload) => {
                    queue.push(payload); // payload is now an array of arrivals
                };
                eventEmitter.on(eventName, handler);

                // Register with cleanup system
                subscriptionCleanup.registerSubscription(subscriptionId, eventName, handler);

                if (latestArrivalData.has(stopId)) {
                    queue.push(latestArrivalData.get(stopId));
                }
                try {
                    while (true) {
                        if (queue.length === 0) {
                            await new Promise((res) => setTimeout(res, 100));
                            continue;
                        }
                        const nextArrivals = queue.shift();
                        yield { stopUpdates: nextArrivals };
                    }
                } finally {
                    //console.log(`Server: Subscription ended for stop ${stopId}`);
                    eventEmitter.off(eventName, handler);
                    subscriptionCleanup.unregisterSubscription(subscriptionId);
                }
            }
        }

    },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
app.use(cors());
app.get('/', (_, res) => res.send('LTC GraphQL WebSocket server running'));

// Keep alive endpoint to keep server running
app.get('/keepalive', (_, res) => {
    res.send('ok');
});

const httpServer = createServer(app);

const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
});

useServer({ schema }, wsServer);


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



const UPDATE_PERIOD_SEC = 30;
let lastVehicleTimestamp = null;
let lastTripTimestamp = null;

async function predictivePollingLoop() {

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

async function handleData(vehicleJson, tripJson) {
    latestVehicleData.clear();
    latestArrivalData.clear();

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
                 // Fallback: if current stop not found in updates, assumes updates start with next stop?
                 // Usually TripUpdates list future stops. If current stop is missing, take the first one?
                 // But safer to assume if stopped, maybe just display "Stopped at X"? 
                 // The UI expects "Destination" (next stop).
                 // If we can't find next stop from updates, maybe just keep current destination?
                 // Or take the first update if its sequence > current sequence? (But sequences are broken).
                 
                 // Checking if the first update stop is different from current stop
                 if (tripUpdate.stop_time_update.length > 0) {
                     const firstUpdate = tripUpdate.stop_time_update[0];
                     if (firstUpdate.stop_id !== mappedStopId) {
                         nextStopId = firstUpdate.stop_id;
                     }
                 }
             }
        }
        
        // Fallback or override with user logic if sequence logic was intended for robustness
        // But since sequence logic is broken due to numbering mismatch, rely on stop_id status.

        // Fallback: if still null, and status is 1, maybe just use mappedStopId to show current location?
        // UI says "Destination". If stopped at X, usually destination is Y.
        // If we can't find Y, showing X is better than "na".
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
            timestamp: vehicleJson.header?.timestamp ?? 0, // fall back to 0 if dne
            occupancy_status: v.occupancy_status ?? null,
            occupancy_percentage: v.occupancy_percentage ?? null,
        };

        if (!latestVehicleData.has(payload.RouteId)) {
            latestVehicleData.set(payload.RouteId, []);
        }
        latestVehicleData.get(payload.RouteId).push(payload);
        eventEmitter.emit(`${VEHICLE_UPDATE}_${payload.RouteId}`, payload);
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
        latestArrivalData.set(stopId, arrivalsToEmit);

        // Emit batch once per stop
        eventEmitter.emit(`${VEHICLE_UPDATE}_STOP_${stopId}`, arrivalsToEmit);
    }


}

predictivePollingLoop();


// Force a reset if the polling loop is stuck
setInterval(() => {
    if (Date.now() - lastSuccessfulUpdateTime > 60000) {
        console.warn('Watchdog: No successful update in 60s, resetting timestamps');
        lastVehicleTimestamp = null;
        lastTripTimestamp = null;
    }
}, 30000);



// Start the subscription cleanup system
subscriptionCleanup.start();

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}/graphql`);
});

// Shut down cleanly
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    isShuttingDown = true;

    // Stop the cleanup system
    subscriptionCleanup.stop();

    wsServer.close();
    httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });

    // Optional: Wait a few seconds in case there's ongoing polling
    setTimeout(() => {
        console.log('Force exiting...');
        process.exit(1);
    }, 2000);
});