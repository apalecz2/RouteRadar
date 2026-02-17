import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import cors from 'cors';

import { PORT } from './src/config.js';
import { subscriptionCleanup } from './src/services/subscriptionService.js';
import { predictivePollingLoop, shutdownPolling, startWatchdog } from './src/services/pollingService.js';
import { schema } from './src/schema.js';

const app = express();
app.use(cors());
app.get('/', (_, res) => res.send('LTC GraphQL WebSocket server running'));

// Keep alive endpoint to keep server running
app.get('/keepalive', (_, res) => {
    res.send('ok');
});

const httpServer = createServer(app);

const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
});

useServer({ schema }, wsServer);

// Start helper services
startWatchdog();
predictivePollingLoop();

// Start the subscription cleanup system
subscriptionCleanup.start();

httpServer.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}/graphql`);
});

// Clean shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    shutdownPolling();

    // Stop the cleanup system
    subscriptionCleanup.stop();

    wsServer.close();
    httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });

    // Wait a few seconds in case there's ongoing polling
    setTimeout(() => {
        console.log('Force exiting...');
        process.exit(1);
    }, 2000);
});