import { gql, useApolloClient } from '@apollo/client';

// GraphQL subscriptions
const VEHICLE_SUBSCRIPTION = gql`
    subscription VehicleUpdates($routeId: String!) {
        vehicleUpdates(routeId: $routeId) {
            RouteId
            Latitude
            Longitude
            Destination
            VehicleId
            Bearing
            timestamp
        }
    }
`;

const STOP_UPDATES_SUB = gql`
    subscription($stopId: String!) {
        stopUpdates(stopId: $stopId) {
            stopId
            routeId
            tripId
            arrivalTime
            delaySeconds
            timestamp
        }
    }
`;

class SubscriptionManager {
    constructor() {
        this.activeSubscriptions = new Map(); // key: subscriptionId, value: { type, variables, subscription, callbacks }
        this.subscriptionCounter = 0;
        this.client = null;
    }

    setClient(client) {
        this.client = client;
    }

    // Generate unique subscription ID
    generateSubscriptionId(type, variables) {
        const key = type === 'vehicle' 
            ? `vehicle:${variables.routeId}`
            : `stop:${variables.stopId}`;
        return key;
    }

    // Subscribe to vehicle updates
    subscribeToVehicle(routeId, callbacks) {
        if (!this.client) {
            console.error('Apollo client not set in SubscriptionManager');
            return null;
        }

        const subscriptionId = this.generateSubscriptionId('vehicle', { routeId });
        
        // If already subscribed, return existing subscription
        if (this.activeSubscriptions.has(subscriptionId)) {
            const existing = this.activeSubscriptions.get(subscriptionId);
            existing.callbacks.push(callbacks);
            return subscriptionId;
        }

        const observable = this.client.subscribe({
            query: VEHICLE_SUBSCRIPTION,
            variables: { routeId },
        });

        const subscription = observable.subscribe({
            next: (data) => {
                const activeSub = this.activeSubscriptions.get(subscriptionId);
                if (activeSub) {
                    activeSub.callbacks.forEach(callback => {
                        if (callback.onNext) callback.onNext(data);
                    });
                }
            },
            error: (error) => {
                const activeSub = this.activeSubscriptions.get(subscriptionId);
                if (activeSub) {
                    activeSub.callbacks.forEach(callback => {
                        if (callback.onError) callback.onError(error);
                    });
                }
            },
            complete: () => {
                const activeSub = this.activeSubscriptions.get(subscriptionId);
                if (activeSub) {
                    activeSub.callbacks.forEach(callback => {
                        if (callback.onComplete) callback.onComplete();
                    });
                }
            }
        });

        this.activeSubscriptions.set(subscriptionId, {
            type: 'vehicle',
            variables: { routeId },
            subscription,
            callbacks: [callbacks]
        });

        console.log(`Subscribed to vehicle updates for route ${routeId}. Total subscriptions: ${this.activeSubscriptions.size}`);
        return subscriptionId;
    }

    // Subscribe to stop updates
    subscribeToStop(stopId, callbacks) {
        console.log('here')
        if (!this.client) {
            console.error('Apollo client not set in SubscriptionManager');
            return null;
        }

        const subscriptionId = this.generateSubscriptionId('stop', { stopId });
        
        // If already subscribed, return existing subscription
        if (this.activeSubscriptions.has(subscriptionId)) {
            const existing = this.activeSubscriptions.get(subscriptionId);
            const safeCallbacks = Array.isArray(callbacks) ? callbacks : [callbacks];
            existing.callbacks.push(...safeCallbacks);
            
            
            return subscriptionId;
        }

        const observable = this.client.subscribe({
            query: STOP_UPDATES_SUB,
            variables: { stopId },
        });

        const subscription = observable.subscribe({
            next: (data) => {
                // data.stopUpdates is now an array
                const activeSub = this.activeSubscriptions.get(subscriptionId);
                if (activeSub) {
                    activeSub.callbacks.forEach(callback => {
                        if (callback.onNext) callback.onNext(data);
                    });
                }
            },
            error: (error) => {
                console.error('e', error)
                const activeSub = this.activeSubscriptions.get(subscriptionId);
                if (activeSub) {
                    activeSub.callbacks.forEach(callback => {
                        if (callback.onError) callback.onError(error);
                    });
                }
            },
            complete: () => {
                console.log('complete')
                const activeSub = this.activeSubscriptions.get(subscriptionId);
                if (activeSub) {
                    activeSub.callbacks.forEach(callback => {
                        if (callback.onComplete) callback.onComplete();
                    });
                }
            }
        });

        this.activeSubscriptions.set(subscriptionId, {
            type: 'stop',
            variables: { stopId },
            subscription,
            callbacks: [callbacks]
        });

        console.log(`Subscribed to stop updates for stop ${stopId}. Total subscriptions: ${this.activeSubscriptions.size}`);
        return subscriptionId;
    }

    // Unsubscribe a specific callback from a subscription
    unsubscribe(subscriptionId, callbackToRemove) {
        const activeSub = this.activeSubscriptions.get(subscriptionId);
        if (!activeSub) return;

        // Remove the specific callback
        activeSub.callbacks = activeSub.callbacks.filter(callback => callback !== callbackToRemove);

        // If no more callbacks, unsubscribe completely
        if (activeSub.callbacks.length === 0) {
            activeSub.subscription.unsubscribe();
            this.activeSubscriptions.delete(subscriptionId);
            console.log(`Unsubscribed from ${activeSub.type} updates. Total subscriptions: ${this.activeSubscriptions.size}`);
        }
    }

    // Unsubscribe completely from a subscription
    unsubscribeCompletely(subscriptionId) {
        const activeSub = this.activeSubscriptions.get(subscriptionId);
        if (!activeSub) return;

        activeSub.subscription.unsubscribe();
        this.activeSubscriptions.delete(subscriptionId);
        console.log(`Completely unsubscribed from ${activeSub.type} updates. Total subscriptions: ${this.activeSubscriptions.size}`);
    }

    // Get all active subscriptions
    getActiveSubscriptions() {
        const subscriptions = [];
        for (const [id, sub] of this.activeSubscriptions) {
            subscriptions.push({
                id,
                type: sub.type,
                variables: sub.variables,
                callbackCount: sub.callbacks.length
            });
        }
        return subscriptions;
    }

    // Get subscription count
    getSubscriptionCount() {
        return this.activeSubscriptions.size;
    }

    // Get subscriptions by type
    getSubscriptionsByType(type) {
        const subscriptions = [];
        for (const [id, sub] of this.activeSubscriptions) {
            if (sub.type === type) {
                subscriptions.push({
                    id,
                    type: sub.type,
                    variables: sub.variables,
                    callbackCount: sub.callbacks.length
                });
            }
        }
        return subscriptions;
    }

    // Resubscribe to all active subscriptions (useful for reconnection scenarios)
    resubscribeAll() {
        const subscriptionsToResubscribe = Array.from(this.activeSubscriptions.entries());
        
        // Clear current subscriptions
        for (const [id, sub] of this.activeSubscriptions) {
            sub.subscription.unsubscribe();
        }
        this.activeSubscriptions.clear();

        // Resubscribe to all
        subscriptionsToResubscribe.forEach(([id, sub]) => {
            if (sub.type === 'vehicle') {
                this.subscribeToVehicle(sub.variables.routeId, ...sub.callbacks);
            } else if (sub.type === 'stop') {
                this.subscribeToStop(sub.variables.stopId, ...sub.callbacks);
            }
        });
    }

    // Clear all subscriptions
    clearAll() {
        for (const [id, sub] of this.activeSubscriptions) {
            sub.subscription.unsubscribe();
        }
        this.activeSubscriptions.clear();
        console.log('Cleared all subscriptions');
    }
}

// Create singleton instance
const subscriptionManager = new SubscriptionManager();

export default subscriptionManager; 