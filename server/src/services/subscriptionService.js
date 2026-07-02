import { eventEmitter } from '../state.js';

// Periodically checks the EventEmitter for listener leaks. Actual subscription
// teardown happens directly via eventEmitter.off() in the resolvers' `finally`
// blocks (see schema.js) — this is monitoring only, not a cleanup mechanism.
export const listenerMonitor = {
    checkListenerCount: function (eventName) {
        const count = eventEmitter.listenerCount(eventName);
        if (count > 10) {
            console.log(`Notice: ${count} listeners for ${eventName}`);
        }
    },

    logListenerCounts: function () {
        const eventNames = eventEmitter.eventNames();
        eventNames.forEach(eventName => {
            const count = eventEmitter.listenerCount(eventName);
            if (count > 5) {
                console.log(`Warning: ${eventName} has ${count} listeners`);
            }
        });
    },

    start: function () {
        this.interval = setInterval(() => {
            this.logListenerCounts();
        }, 30000);
    },

    stop: function () {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
};
