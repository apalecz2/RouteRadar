import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { fetchFeed } from '../src/services/pollingService.js';

const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;

// A stub feed server standing in for LTC, so the 304 path can be exercised on
// demand instead of waiting for the real feed to happen to not change.
function encodeFeed({ timestamp, vehicleId }) {
    return Buffer.from(FeedMessage.encode(FeedMessage.fromObject({
        header: { gtfsRealtimeVersion: '2.0', timestamp },
        entity: [{
            id: 'entity-1',
            vehicle: {
                trip: { routeId: 'R1', tripId: 'T1' },
                position: { latitude: 42.98, longitude: -81.23 },
                vehicle: { id: vehicleId },
                currentStatus: 2,
                stopId: 'STOP_1',
            },
        }],
    })).finish());
}

let server;
let baseUrl;
let state;
const requests = [];

before(async () => {
    state = { body: encodeFeed({ timestamp: 1000, vehicleId: 'BUS_1' }), etag: '"v1"' };

    server = http.createServer((req, res) => {
        requests.push({
            ifNoneMatch: req.headers['if-none-match'],
            ifModifiedSince: req.headers['if-modified-since'],
        });

        if (req.headers['if-none-match'] === state.etag) {
            res.writeHead(304).end();
            return;
        }

        res.writeHead(200, {
            'ETag': state.etag,
            'Last-Modified': 'Wed, 12 Aug 2026 20:00:00 GMT',
            'Content-Type': 'application/octet-stream',
        });
        res.end(state.body);
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test('fetchFeed: first fetch downloads and decodes the feed', async () => {
    const { feed, changed } = await fetchFeed(`${baseUrl}/first`);

    assert.equal(changed, true);
    assert.equal(feed.entity.length, 1);
    assert.equal(feed.entity[0].vehicle.vehicle.id, 'BUS_1');
    // No validators to send on a first, uncached request.
    assert.equal(requests.at(-1).ifNoneMatch, undefined);
});

test('fetchFeed: revalidates with the cached validators on the next fetch', async () => {
    const url = `${baseUrl}/revalidate`;
    await fetchFeed(url);

    const { changed } = await fetchFeed(url);

    assert.equal(changed, false, 'unchanged feed should be reported as unchanged');
    assert.equal(requests.at(-1).ifNoneMatch, '"v1"');
    assert.equal(requests.at(-1).ifModifiedSince, 'Wed, 12 Aug 2026 20:00:00 GMT');
});

test('fetchFeed: a 304 still yields the previously decoded feed', async () => {
    // handleData needs both feeds every cycle, so an unchanged one must come back
    // usable rather than empty.
    const url = `${baseUrl}/reuse`;
    const first = await fetchFeed(url);
    const second = await fetchFeed(url);

    assert.equal(second.changed, false);
    assert.equal(second.feed.entity[0].vehicle.vehicle.id, 'BUS_1');
    assert.equal(second.feed, first.feed, 'should hand back the cached feed object');
    // The header timestamp is unchanged, which is what makes the polling loop
    // treat the cycle as "no new data" without any extra branching.
    assert.equal(Number(second.feed.header.timestamp), 1000);
});

test('fetchFeed: downloads again once the feed actually changes', async () => {
    const url = `${baseUrl}/changed`;
    await fetchFeed(url);
    assert.equal((await fetchFeed(url)).changed, false);

    state.etag = '"v2"';
    state.body = encodeFeed({ timestamp: 2000, vehicleId: 'BUS_2' });

    const { feed, changed } = await fetchFeed(url);

    assert.equal(changed, true);
    assert.equal(feed.entity[0].vehicle.vehicle.id, 'BUS_2');
    assert.equal(Number(feed.header.timestamp), 2000);

    state.etag = '"v1"';
    state.body = encodeFeed({ timestamp: 1000, vehicleId: 'BUS_1' });
});

test('fetchFeed: throws on an error status rather than decoding the body', async () => {
    const errorServer = http.createServer((_, res) => {
        res.writeHead(500, { 'Content-Type': 'text/html' }).end('<html>error</html>');
    });
    await new Promise((resolve) => errorServer.listen(0, '127.0.0.1', resolve));

    try {
        await assert.rejects(
            () => fetchFeed(`http://127.0.0.1:${errorServer.address().port}/boom`),
            /responded 500/,
        );
    } finally {
        errorServer.close();
    }
});
