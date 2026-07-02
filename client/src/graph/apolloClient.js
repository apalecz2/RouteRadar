import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { connectionStatus } from '../utils/connectionStatus';
import subscriptionManager from '../utils/subscriptionManager'

const wsClient = createClient({
    url: import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:4000/graphql',
    retryAttempts: Infinity,
    shouldRetry: () => true, // Always retry
    keepAlive: 10000, // Ping every 10 seconds to detect stale connections faster
    retryWait: async (retries) => {
        // Update connection status with current retry count
        connectionStatus.update({ connected: false, retryCount: retries + 1 });

        // Start with short delays to reconnect quickly, then back off slightly but cap it
        // 1s, 2s, 4s, but cap at 5s to keep checking frequently
        const delay = Math.min(Math.pow(2, retries) * 1000, 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
    },
    lazy: false, // This should make it connect immediately
    on: {
        connecting: () => {
            const { retryCount } = connectionStatus.get();
            console.log(retryCount > 0 ? `[WS] Reconnecting #${retryCount}` : '[WS] Connecting...');
        },
        connected: () => {
            console.log('[WS] Connected');
            connectionStatus.update({ connected: true, retryCount: 0, hasConnected: true });
        },
        closed: (event) => {
            console.warn('[WS] Disconnected:', event);
            connectionStatus.update({ connected: false });
        },
        error: (error) => {
            console.error('[WS] Error:', error);
            // Mark as disconnected; retryCount itself is tracked in retryWait()
            connectionStatus.update({ connected: false });
        },
    },
});

// Confirms the socket is actually usable (not just open) by running a throwaway subscription:
// a working connection calls both next and complete, a broken one only calls complete (or errors).
export const reconnectWebSocketHelper = async () => {
    return new Promise((resolve) => {
        let sawNext = false;
        let sawComplete = false;
        let unsubscribe;

        unsubscribe = wsClient.subscribe(
            { query: '{ __typename }' },
            {
                next: () => {
                    sawNext = true;
                },
                error: (error) => {
                    console.error('[WS] Test subscription error:', error);
                    resolve(false);
                },
                complete: () => {
                    sawComplete = true;
                    resolve(sawNext);
                },
            }
        );

        // Timeout safeguard
        setTimeout(() => {
            if (!sawNext && !sawComplete) {
                console.warn('[WS] Test subscription timed out');
                if (unsubscribe) unsubscribe();
                resolve(false);
            }
        }, 5000);
    }).then((success) => {
        // We rely on the client's automatic reconnection for the socket itself; if the test
        // subscription succeeded, resubscribe active queries in case they were dropped mid-outage.
        if (success) {
            subscriptionManager.resubscribeAll();
        } else {
            console.warn('[WS] Reconnection check failed');
        }
        return success;
    });
};

export const reconnectWebSocket = async () => {
    const success = await reconnectWebSocketHelper();
    if (success) {
        console.log('[WS] Connection restored successfully.');
    } else {
        console.log('[WS] Reconnection failed or incomplete.');
    }
};

// Listen for browser online/offline events to trigger reconnection aggressively
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[WS] Browser back online. Forcing reconnection...');
        reconnectWebSocket();
    });
}

// Inject the function into connection status so it can call reconnect
connectionStatus.setReconnectFunction(() => {
    reconnectWebSocket();
});

const wsLink = new GraphQLWsLink(wsClient);

// The API is subscription-only (see server/src/schema.js) — no query/mutation link is needed.
export const client = new ApolloClient({
    link: wsLink,
    cache: new InMemoryCache(),
});
