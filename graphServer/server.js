import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import fetch from 'node-fetch';
import cors from 'cors';
import { EventEmitter } from 'events';

const DATA_URL = 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.json';
const POLL_INTERVAL = 5000;
const VEHICLE_UPDATE = 'VEHICLE_UPDATE';

const eventEmitter = new EventEmitter();

const typeDefs = `
  type Vehicle {
    RouteId: String
    Latitude: Float
    Longitude: Float
    Destination: String
    VehicleId: String
  }

  type Query {
    _empty: String
  }

  type Subscription {
    vehicleUpdates(routeId: String!): Vehicle
  }
`;

const resolvers = {
  Subscription: {
    vehicleUpdates: {
      subscribe: async function* (_, { routeId }) {
        const eventName = `${VEHICLE_UPDATE}_${routeId}`;

        const queue = [];
        const handler = (payload) => queue.push(payload);

        eventEmitter.on(eventName, handler);

        try {
          while (true) {
            if (queue.length === 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
              continue;
            }

            yield { vehicleUpdates: queue.shift() };
          }
        } finally {
          eventEmitter.off(eventName, handler);
        }
      },
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
app.use(cors());
app.get('/', (_, res) => res.send('LTC GraphQL WebSocket server running'));

const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

useServer({ schema }, wsServer);

async function pollAndPublish() {
  try {
    const res = await fetch(DATA_URL);
    const json = await res.json();

    if (!json.entity || !Array.isArray(json.entity)) {
      console.log('No entities in feed');
      return;
    }

    for (const entity of json.entity) {
      const v = entity.vehicle;
      if (v?.trip?.route_id && v?.position?.latitude && v?.position?.longitude) {
        const payload = {
          RouteId: v.trip.route_id,
          Latitude: v.position.latitude,
          Longitude: v.position.longitude,
          Destination: v.trip.trip_id,
          VehicleId: v.vehicle.id,
        };

        console.log(`Publishing for route ${payload.RouteId}`, payload);

        eventEmitter.emit(`${VEHICLE_UPDATE}_${v.trip.route_id}`, payload);
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }
}

setInterval(pollAndPublish, POLL_INTERVAL);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
});
