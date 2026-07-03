// CLI entry point: reads an already-downloaded-and-extracted GTFS static feed
// and writes stops.json / routes.json in the client's public directory.
//
// Usage: node scripts/gtfs-static/update.mjs <extracted-gtfs-dir> [output-dir]
// The extracted-gtfs-dir must contain routes.txt, trips.txt, shapes.txt,
// stops.txt and stop_times.txt (i.e. the unzipped contents of LTC's
// google_transit.zip). output-dir defaults to client/public relative to the
// repo root.
//
// Fetching/unzipping the feed is left to the caller (a couple of shell
// commands in CI) rather than done here, so this script stays a pure,
// unit-testable transform — see transform.test.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformGtfsStatic } from './transform.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
    const [gtfsDir, outDirArg] = process.argv.slice(2);
    if (!gtfsDir) {
        console.error('Usage: node scripts/gtfs-static/update.mjs <extracted-gtfs-dir> [output-dir]');
        process.exit(1);
    }

    const outDir = outDirArg ?? path.join(__dirname, '..', '..', 'client', 'public');

    const { stops, routes } = transformGtfsStatic(gtfsDir);

    if (stops.length === 0) throw new Error('Transform produced zero stops — refusing to write, feed likely malformed');
    if (routes.length === 0) throw new Error('Transform produced zero routes — refusing to write, feed likely malformed');

    writeJson(path.join(outDir, 'stops.json'), stops);
    writeJson(path.join(outDir, 'routes.json'), routes);

    console.log(`Wrote ${stops.length} stops and ${routes.length} routes to ${outDir}`);
}

main();
