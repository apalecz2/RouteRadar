import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { connectionStatus } from '../utils/connectionStatus';

const httpLink = new HttpLink({
    uri: import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000/graphql',
});

const wsClient = createClient({
    url: import.meta.env.VITE_BACKEND_WS_URL || 'ws://192.168.0.233:4000/graphql',
    retryAttempts: 5,
    lazy: false,
    on: {
        connecting: () => {
            const { retryCount } = connectionStatus.get();
            console.log(retryCount > 0 ? `[WS] Reconnecting #${retryCount}` : '[WS] Connecting...');
        },
        connected: () => {
            console.log('[WS] Connected');
            connectionStatus.update({ connected: true, retryCount: 0 });
        },
        closed: (event) => {
            console.warn('[WS] Disconnected:', event);
            const { retryCount } = connectionStatus.get();
            connectionStatus.update({ connected: false, retryCount: retryCount + 1 });
        },
        error: (error) => {
            console.error('[WS] Error:', error);
        },
    },
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
