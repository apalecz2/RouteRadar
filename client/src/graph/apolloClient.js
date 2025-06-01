// apolloClient.js
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({
    uri: 'https://localhost:4000/graphql',
  });
  
  const wsLink = new GraphQLWsLink(createClient({
    url: 'ws://localhost:4000/graphql',
  }));

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
  
  //export default client;

