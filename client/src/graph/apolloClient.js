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
    url: import.meta.env.VITE_BACKEND_WS_URL || 'ws://192.168.0.233:4000/graphql',
    retryAttempts: 5,
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
            const { retryCount } = connectionStatus.get();
            connectionStatus.update({ connected: false, retryCount: retryCount + 1 });
        },
        error: (error) => {
            console.error('[WS] Error:', error);
            // Also mark as disconnected on error
            const { retryCount } = connectionStatus.get();
            connectionStatus.update({ connected: false, retryCount: retryCount + 1 });
        },
    },
});

// Use the fact that a test subscription will call complete but not next if it cannot connect, while it will
// call both if connection is successful
export const reconnectWebSocketHelper = async () => {
    console.log('[WS] Forcing reconnection...');

    // Mark as disconnected to trigger reconnection logic
    connectionStatus.update({ connected: false, retryCount: connectionStatus.get().retryCount + 1 });

    // Close the current connection
    wsClient.dispose();

    // Wait a moment for cleanup from dispose, just in case
    await new Promise((res) => setTimeout(res, 100));

    return new Promise((resolve) => {
        let sawNext = false;
        let sawComplete = false;

        const unsubscribe = wsClient.subscribe(
            { query: '{ __typename }' },
            {
                next: () => {
                    console.log('[WS] Test subscription successful - connection working');
                    sawNext = true;
                    unsubscribe(); // safe to call even if complete hasn't fired yet
                },
                error: (error) => {
                    console.error('[WS] Test subscription error:', error);
                    resolve(false); // immediate failure
                },
                complete: () => {
                    console.log('[WS] Test subscription completed');
                    sawComplete = true;

                    // If we saw both complete and next, the connection is valid
                    if (sawNext && sawComplete) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                },
            }
        );

        // Optional timeout safeguard
        setTimeout(() => {
            if (!sawNext || !sawComplete) {
                console.warn('[WS] Test subscription timed out');
                resolve(false);
            }
        }, 5000); // 5 seconds max
    }).then((success) => {
        // Resubscribe only if the connection test passed
        if (success) {
            console.log('[WS] Reconnection succeeded, resubscribing...');
            subscriptionManager.resubscribeAll();
        } else {
            console.warn('[WS] Reconnection failed');
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
