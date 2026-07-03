import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformGtfsStatic } from './transform.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '__fixtures__', 'mini-gtfs');

const { stops, routes } = transformGtfsStatic(fixtureDir);

test('drops stops with no stop_code', () => {
    assert.equal(stops.length, 2);
    assert.ok(!stops.some((s) => s.stop_id === 'STOPNOCODE'));
});

test('maps stop_code to id, stop_id, and strips the trailing "- #code" from the name', () => {
    const stopA = stops.find((s) => s.stop_id === 'STOPA');
    assert.deepEqual(stopA, {
        id: 100,
        stop_id: 'STOPA',
        name: 'Main at First NB',
        coordinates: [43.0, -81.0],
        routes: ['1A', '7'],
    });
});

test('labels a route branch from the majority trip_headsign at that stop', () => {
    const stopB = stops.find((s) => s.stop_id === 'STOPB');
    // Only trip serving STOPB is T3, headsigned "1B Uptown" -> branch label "1B".
    assert.deepEqual(stopB.routes, ['1B']);
});

test('falls back to the bare route number when no branch letter is found', () => {
    const stopA = stops.find((s) => s.stop_id === 'STOPA');
    // route 2 (short_name "7") trip T4 is headsigned "Mall Loop" - no leading
    // "<digits><letter>" token, so it should fall back to "7", not error or drop it.
    assert.ok(stopA.routes.includes('7'));
});

test('routes.json uses the raw route_short_name (zero-padding kept) as id', () => {
    assert.deepEqual(
        routes.map((r) => r.id),
        ['01', '7'],
    );
});

test('excludes routes with no shapes', () => {
    assert.ok(!routes.some((r) => r.id === '99'));
});

test('builds one segment per distinct shape used by the route', () => {
    const route01 = routes.find((r) => r.id === '01');
    assert.equal(route01.segments.length, 2);
    assert.deepEqual(route01.segments[0][0], [43.0, -81.0]);
});
