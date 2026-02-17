import { eventEmitter } from '../state.js';

// Separate cleanup system for EventEmitter listeners
export const subscriptionCleanup = {
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
