import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load stop mapping
const stopsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'public', 'stops.json'), 'utf8')
);
export const stopIdMap = new Map();
for (const stop of stopsData) {
    if (stop.id && stop.stop_id) {
        stopIdMap.set(String(stop.id), stop.stop_id);
    }
}
console.log(`Loaded ${stopIdMap.size} stops for ID mapping`);

export const eventEmitter = new EventEmitter();
// Increase max listeners to handle rapid subscription changes
eventEmitter.setMaxListeners(100);

// Global state
export const latestVehicleData = new Map(); // Key: routeId, Value: Array of vehicle objects
export const latestArrivalData = new Map();