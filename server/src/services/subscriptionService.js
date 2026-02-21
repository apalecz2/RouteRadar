import { eventEmitter } from '../state.js';

// Separate cleanup system for EventEmitter listeners
export const subscriptionCleanup = {
    /* 
    activeSubscriptions: new Map(), // activeSubscriptions removed as it is no longer used for cleanup
    */

    // Register a subscription for cleanup tracking
    registerSubscription: function (subscriptionId, eventName, handler) {
        // No-op
    },

    // Unregister a subscription from cleanup tracking
    unregisterSubscription: function (subscriptionId) {
        // No-op
    },

    // Force cleanup of orphaned listeners
    cleanupOrphanedListeners: function () {
        // Log current listener counts for debugging
        const eventNames = eventEmitter.eventNames();
        eventNames.forEach(eventName => {
            const count = eventEmitter.listenerCount(eventName);
            if (count > 5) {
                console.log(`Warning: ${eventName} has ${count} listeners`);
            }
        });
    },

    // Check listener count for specific event
    checkListenerCount: function (eventName) {
        const count = eventEmitter.listenerCount(eventName);
        // Only log warning, do not remove listeners as it disconnects active users
        if (count > 10) {
            console.log(`Notice: ${count} listeners for ${eventName}`);
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
