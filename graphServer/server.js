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

const VEHICLE_URL = 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.json';
const TRIP_UPDATE_URL = 'http://gtfs.ltconline.ca/TripUpdate/TripUpdates.json';

const POLL_INTERVAL = 5000;
const VEHICLE_UPDATE = 'VEHICLE_UPDATE';

const eventEmitter = new EventEmitter();

const latestVehicleData = new Map(); // Key: routeId, Value: Array of vehicle objects

const typeDefs = `
  type Vehicle {
    RouteId: String
    Latitude: Float
    Longitude: Float
    Destination: String
    VehicleId: String
    Bearing: Float
  }
    
  type StopArrival {
    stopId: String!
    routeId: String!
    tripId: String!
    arrivalTime: Int!
    delaySeconds: Int
  }

  type Query {
    _empty: String
  }

  type Subscription {
    vehicleUpdates(routeId: String!): Vehicle
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

                const handler = (payload) => queue.push(payload);
                eventEmitter.on(eventName, handler);

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
                }
            },
        },
        stopUpdates: {
            subscribe: async function* (_, { stopId }) {
                const queue = [];
                const handler = (payload) => queue.push(payload);
                eventEmitter.on(`${VEHICLE_UPDATE}_STOP_${stopId}`, handler);

                try {
                    while (true) {
                        if (queue.length === 0) {
                            await new Promise(res => setTimeout(res, 100));
                            continue;
                        }
                        yield { stopUpdates: queue.splice(0, queue.length) };
                    }
                } finally {
                    eventEmitter.off(`${VEHICLE_UPDATE}_STOP_${stopId}`, handler);
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


async function pollAndPublish() {
    try {
        const [vehicleRes, tripRes] = await Promise.all([
            fetch(VEHICLE_URL),
            fetch(TRIP_UPDATE_URL),
        ]);

        const [vehicleJson, tripJson] = await Promise.all([
            vehicleRes.json(),
            tripRes.json(),
        ]);

        latestVehicleData.clear();

        // Build a map: vehicleId => stop_ids[]
        const vehicleToStops = new Map();

        for (const entity of tripJson.entity) {
            const trip = entity.trip_update;
            const vehicleId = trip?.vehicle?.id;
            if (!vehicleId || !trip.stop_time_update) continue;

            const stopIds = trip.stop_time_update.map(update => update.stop_id);
            vehicleToStops.set(vehicleId, stopIds);
        }

        for (const entity of vehicleJson.entity) {
            const v = entity.vehicle;
            if (!v?.trip?.route_id || !v?.position?.latitude || !v?.position?.longitude) continue;

            const payload = {
                RouteId: v.trip.route_id,
                Latitude: v.position.latitude,
                Longitude: v.position.longitude,
                Destination: v.trip.trip_id,
                VehicleId: v.vehicle.id,
                Bearing: v.position.bearing,
            };
            
            // Store route-wise
            if (!latestVehicleData.has(payload.RouteId)) {
                latestVehicleData.set(payload.RouteId, []);
            }
            latestVehicleData.get(payload.RouteId).push(payload);

            // Emit route-specific update
            eventEmitter.emit(`${VEHICLE_UPDATE}_${payload.RouteId}`, payload);

            // Track already emitted arrivals during this poll
            const emittedArrivals = new Set();

            for (const entity of tripJson.entity) {
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
                    };

                    eventEmitter.emit(`${VEHICLE_UPDATE}_STOP_${stopId}`, stopArrivalPayload);
                }
            }


        }

    } catch (err) {
        console.error('Polling error:', err.message);
    }
}


setInterval(pollAndPublish, POLL_INTERVAL);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}/graphql`);
});
