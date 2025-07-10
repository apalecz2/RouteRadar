const listeners = new Set()

let state = {
    retryCount: 0,
    connected: false, // Start as disconnected so initial connection failures trigger reconnection
    hasConnected: false,
};

let reconnectFn = null;
let watchInterval = null;

const startWatchingConnection = () => {
    if (watchInterval) return; // Already running

    console.log('[ConnectionStatus] Starting watch...');

    watchInterval = setInterval(() => {
        const { retryCount, connected, hasConnected } = state;
        if (retryCount >= 2 && !connected && !hasConnected) {
            console.log('[ConnectionStatus] Still disconnected. Running watch action...');

            if (reconnectFn) reconnectFn();

        } else {
            clearInterval(watchInterval);
            watchInterval = null;
        }
    }, 5000);
};


let watchReconnInterval = null;

const startWatchingReConnection = () => {
    
    if (watchReconnInterval) return; // Already running

    console.log('[ConnectionStatus] Starting watch...');

    watchReconnInterval = setInterval(() => {
        const { connected, hasConnected } = state;
        if (!connected && hasConnected) {
            console.log('[ConnectionStatus] Still disconnected. Running watch action...');

            if (reconnectFn) reconnectFn();

        } else {
            clearInterval(watchReconnInterval);
            watchReconnInterval = null;
        }
    }, 5000);
    
}


export const connectionStatus = {
    get: () => state,

    subscribe: (callback) => {
        listeners.add(callback);
        callback(state); // send initial state
        return () => listeners.delete(callback);
    },

    update: (updates) => {
        const oldState = { ...state };
        state = { ...state, ...updates };
        console.log('[ConnectionStatus] State updated:', { old: oldState, new: state });
        listeners.forEach((cb) => cb(state));

        // Start watching for initial connection, if initial connection cannot be made right away
        if (
            state.retryCount >= 2 &&
            !state.connected &&
            !state.hasConnected
        ) {
            startWatchingConnection();
        }
        else if (!state.connected && state.hasConnected) {
            startWatchingReConnection();
        }

    },

    setReconnectFunction: (fn) => {
        reconnectFn = fn;
    },
};