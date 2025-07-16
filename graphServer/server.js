//VehiclePositions Sample:
/*
{
    "header": {
        "gtfs_realtime_version": "2.0",
        "incrementality": 0,
        "timestamp": 1749780231
    },
    "entity": [
        {
            "id": "27",
            "is_deleted": false,
            "trip_update": null,
            "vehicle": {
                "trip": {
                    "trip_id": "2154700",
                    "start_time": "",
                    "start_date": "20250612",
                    "schedule_relationship": 0,
                    "route_id": "25",
                    "direction_id": 1
                },
                "position": {
                    "latitude": 43.02554,
                    "longitude": -81.28163,
                    "bearing": 270,
                    "odometer": 0,
                    "speed": 0
                },
                "current_stop_sequence": 0,
                "current_status": 2,
                "timestamp": 1749780213,
                "congestion_level": 0,
                "stop_id": "",
                "vehicle": {
                    "id": "3027",
                    "label": "27",
                    "license_plate": ""
                },
                "occupancy_status": 5,
                "occupancy_percentage": 120,
                "multi_carriage_details": []
            },
            "alert": null,
            "shape": null,
            "trip": null,
            "route": null,
            "stop": null
        },
*/
// TripUpdates Sample:
/*
{
    "header": {
        "gtfs_realtime_version": "2.0",
        "incrementality": 0,
        "timestamp": 1749780261
    },
    "entity": [
        {
            "id": "2154700",
            "is_deleted": false,
            "trip_update": {
                "trip": {
                    "trip_id": "2154700",
                    "start_time": "22:05:00",
                    "start_date": "20250612",
                    "schedule_relationship": 0,
                    "route_id": "25",
                    "direction_id": 1
                },
                "stop_time_update": [
                    {
                        "stop_sequence": 1,
                        "arrival": {
                            "delay": 13,
                            "time": 1749780313,
                            "uncertainty": 0,
                            "schedule_time": 1749780300
                        },
                        "departure": {
                            "delay": 13,
                            "time": 1749780313,
                            "uncertainty": 0,
                            "schedule_time": 1749780300
                        },
                        "stop_id": "MASOSTO2",
                        "schedule_relationship": 0,
                        "stop_time_properties": {
                            "assigned_stop_id": "",
                            "stop_headsign": {
                                "translation": [
                                    {
                                        "text": "",
                                        "language": "en"
                                    }
                                ]
                            },
                            "pickup_type": 0,
                            "drop_off_type": 1,
                            "shape_dist_traveled": 0
                        },
                        "departure_occupancy_status": 0
                    },
*/



import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import fetch from 'node-fetch';
import cors from 'cors';
import { EventEmitter } from 'events';
import { AbortController } from 'abort-controller';

let isShuttingDown = false;

const VEHICLE_URL = 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.json';
const TRIP_UPDATE_URL = 'http://gtfs.ltconline.ca/TripUpdate/TripUpdates.json';

const VEHICLE_UPDATE = 'VEHICLE_UPDATE';

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
        const currentSeq = v.current_stop_sequence;
        const tripUpdate = tripUpdateMap.get(tripId);
        if (tripUpdate && Array.isArray(tripUpdate.stop_time_update)) {
            // Find the stop_time_update with stop_sequence just after current_stop_sequence
            let minDiff = Infinity;
            for (const stu of tripUpdate.stop_time_update) {
                if (typeof stu.stop_sequence !== 'number') continue;
                const diff = stu.stop_sequence - currentSeq;
                if (diff > 0 && diff < minDiff) {
                    minDiff = diff;
                    nextStopId = stu.stop_id;
                }
            }
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