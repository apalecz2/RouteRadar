import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { connectionStatus } from '../utils/connectionStatus';
import subscriptionManager from '../utils/subscriptionManager'

const httpLink = new HttpLink({
    uri: import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000/graphql',
});

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
            console.log('[WS] Current connection status before update:', connectionStatus.get());
            connectionStatus.update({ connected: true, retryCount: 0, hasConnected: true });
            console.log('[WS] Connection status after update:', connectionStatus.get());
        },
        closed: (event) => {
            console.warn('[WS] Disconnected:', event);
            connectionStatus.update({ connected: false });
        },
        error: (error) => {
            console.error('[WS] Error:', error);
            // Also mark as disconnected on error
            const { retryCount } = connectionStatus.get();
            // Don't increment retryCount on error if it was just a connection error handled by closed
            connectionStatus.update({ connected: false });
        },
    },
});

// Use the fact that a test subscription will call complete but not next if it cannot connect, while it will
// call both if connection is successful
export const reconnectWebSocketHelper = async () => {
    console.log('[WS] Forcing reconnection check...');

    // Mark as disconnected to trigger reconnection logic if needed
    // However, we rely on the client's built-in retry logic now.
    // If the client is disconnected, we can just let it retry.
    // But if we want to confirm connectivity, we can try a subscription.

    return new Promise((resolve) => {
        let sawNext = false;
        let sawComplete = false;
        let unsubscribe;

        // Check connection with a query
        unsubscribe = wsClient.subscribe(
            { query: '{ __typename }' },
            {
                next: () => {
                    console.log('[WS] Test subscription successful - connection working');
                    sawNext = true;
                },
                error: (error) => {
                    console.error('[WS] Test subscription error:', error);
                    resolve(false); 
                },
                complete: () => {
                    console.log('[WS] Test subscription completed');
                    sawComplete = true;
                    if (sawNext) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                },
            }
        );

        // Optional timeout safeguard
        setTimeout(() => {
            if (!sawNext && !sawComplete) {
                console.warn('[WS] Test subscription timed out');
                // Don't unsubscribe here if we want to keep trying?
                // But for a test, we should time out.
                if (unsubscribe) unsubscribe();
                resolve(false);
            }
        }, 5000); // 5 seconds max
    }).then((success) => {
        // We rely on the client's automatic reconnection.
        // We don't need to manually resubscribeAll unless something is wrong with the link state.
        if (success) {
             console.log('[WS] Connection verified.');
             // Check if we need to manually resync any state, but usually graphql-ws handles it.
             // If we really need to force a refresh, we could.
             // But let's assume automatic handling is sufficient for now.
             subscriptionManager.resubscribeAll();
        } else {
            console.warn('[WS] Reconnection check failed');
        }
        return success;
    });

};

export const reconnectWebSocket = async () => {
    // Only try if the socket has never connected
    //if (!connectionStatus.get().hasConnected || subscriptionManager.getSubscriptionCount() == 0) {
        const success = await reconnectWebSocketHelper();
        if (success) {
            console.log('WebSocket connection restored successfully.');
        } else {
            console.log('WebSocket reconnection failed or incomplete.');
        }
    //} else {
        console.log('Already connected')
    //}
}

// Listen for browser online/offline events to trigger reconnection aggressively
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[WS] Browser back online. Forcing reconnection...');
        // Force a check/reconnect cycle
        reconnectWebSocket();
    });
}

// Inject the function into connection status so it can call reconnect
connectionStatus.setReconnectFunction(() => {
    reconnectWebSocket();
});


const wsLink = new GraphQLWsLink(wsClient);

const splitLink = split(
    ({ query }) => {
        const def = getMainDefinition(query);
        return def.kind === 'OperationDefinition' && def.operation === 'subscription';
    },
    wsLink,
    httpLink
);

export const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
});
