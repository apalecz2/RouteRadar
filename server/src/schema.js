import { makeExecutableSchema } from '@graphql-tools/schema';
import { eventEmitter, latestVehicleData, latestArrivalData } from './state.js';
import { listenerMonitor } from './services/subscriptionService.js';

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
                const eventName = `VEHICLE_UPDATE_${routeId}`;
                const queue = [];

                // Warn if too many listeners have accumulated for this event
                listenerMonitor.checkListenerCount(eventName);

                let triggerPromise = null;
                const handler = (payload) => {
                    if (Array.isArray(payload)) {
                        queue.push(...payload);
                    } else {
                        queue.push(payload);
                    }
                    if (triggerPromise) {
                        triggerPromise();
                        triggerPromise = null;
                    }
                };
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
                            await new Promise(resolve => triggerPromise = resolve);
                        }

                        while (queue.length > 0) {
                            yield { vehicleUpdates: queue.shift() };
                        }
                    }
                } finally {
                    eventEmitter.off(eventName, handler);
                }
            },
        },
        stopUpdates: {
            subscribe: async function* (_, { stopId }) {
                const queue = [];
                const eventName = `VEHICLE_UPDATE_STOP_${stopId}`;

                // Warn if too many listeners have accumulated for this event
                listenerMonitor.checkListenerCount(eventName);

                let triggerPromise = null;
                const handler = (payload) => {
                    queue.push(payload); // payload array of arrivals
                    if (triggerPromise) {
                        triggerPromise();
                        triggerPromise = null;
                    }
                };
                eventEmitter.on(eventName, handler);

                if (latestArrivalData.has(stopId)) {
                    queue.push(latestArrivalData.get(stopId));
                }
                try {
                    while (true) {
                        if (queue.length === 0) {
                            await new Promise((res) => triggerPromise = res);
                        }

                        while(queue.length > 0) {
                            const nextArrivals = queue.shift();
                            yield { stopUpdates: nextArrivals };
                        }
                    }
                } finally {
                    eventEmitter.off(eventName, handler);
                }
            }
        }
    },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });