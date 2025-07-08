
const listeners = new Set()

let state = {
    retryCount: 0,
    connected: true,
};

export const connectionStatus = {
    get: () => state,

    subscribe: (callback) => {
        listeners.add(callback);
        callback(state); // send initial state
        return () => listeners.delete(callback);
    },

    update: (updates) => {
        state = { ...state, ...updates };
        listeners.forEach((cb) => cb(state));
    },
};