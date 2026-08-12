import { makeExecutableSchema } from '@graphql-tools/schema';
import { eventEmitter, latestVehicleData, latestArrivalData } from './state.js';
import { listenerMonitor } from './services/subscriptionService.js';
import { addSubscription, removeSubscription } from './services/activityService.js';

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

// Bridges an EventEmitter event to a GraphQL subscription.
//
// Deliberately a hand-written async iterator rather than an async generator.
// graphql-ws ends a subscription by calling return() on the iterator, but an
// async generator parked on an `await` only handles a queued return() at a
// `yield` — and a generator waiting for its next event never reaches one. Its
// finally block therefore never ran, leaking an eventEmitter listener per
// subscription and, worse, leaving the poller convinced it still had an audience.
// Here return() closes the iterator directly, so teardown is immediate.
//
//   enqueue: how a raw event payload is appended to the queue
//   seed:    latest cached value, delivered before any live event
//   project: wraps a queued item in its GraphQL response shape
function createEventIterator({ eventName, enqueue, seed, project }) {
    const queue = [];
    let notifyNext = null;
    let closed = false;

    const handler = (payload) => {
        if (closed) return;
        enqueue(queue, payload);
        if (notifyNext) {
            const resolve = notifyNext;
            notifyNext = null;
            resolve();
        }
    };

    // Warn if too many listeners have accumulated for this event
    listenerMonitor.checkListenerCount(eventName);
    eventEmitter.on(eventName, handler);
    // Keeps the poller awake for as long as this subscription lives.
    addSubscription();

    seed(queue);

    function close() {
        if (closed) return;
        closed = true;
        eventEmitter.off(eventName, handler);
        removeSubscription();
        // Release a consumer parked in next() so it can observe the close.
        if (notifyNext) {
            const resolve = notifyNext;
            notifyNext = null;
            resolve();
        }
    }

    return {
        async next() {
            while (!closed) {
                if (queue.length > 0) {
                    return { value: project(queue.shift()), done: false };
                }
                await new Promise((resolve) => { notifyNext = resolve; });
            }
            return { value: undefined, done: true };
        },
        async return() {
            close();
            return { value: undefined, done: true };
        },
        async throw(err) {
            close();
            throw err;
        },
        [Symbol.asyncIterator]() { return this; },
    };
}

const resolvers = {
    Subscription: {
        vehicleUpdates: {
            subscribe: (_, { routeId }) => createEventIterator({
                eventName: `VEHICLE_UPDATE_${routeId}`,
                // Batches arrive per route; clients consume one vehicle at a time.
                enqueue: (queue, payload) => {
                    if (Array.isArray(payload)) queue.push(...payload);
                    else queue.push(payload);
                },
                // Immediately enqueue latest data for this routeId
                seed: (queue) => {
                    if (latestVehicleData.has(routeId)) {
                        queue.push(...latestVehicleData.get(routeId));
                    }
                },
                project: (vehicle) => ({ vehicleUpdates: vehicle }),
            }),
        },
        stopUpdates: {
            subscribe: (_, { stopId }) => createEventIterator({
                eventName: `VEHICLE_UPDATE_STOP_${stopId}`,
                // A stop's arrivals are delivered as one array per update.
                enqueue: (queue, payload) => queue.push(payload),
                seed: (queue) => {
                    if (latestArrivalData.has(stopId)) {
                        queue.push(latestArrivalData.get(stopId));
                    }
                },
                project: (arrivals) => ({ stopUpdates: arrivals }),
            }),
        }
    },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });