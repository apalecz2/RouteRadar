import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleData } from '../src/services/pollingService.js';
import { eventEmitter, latestVehicleData, latestArrivalData } from '../src/state.js';

// Fixtures mirror a decoded GTFS-Realtime FeedMessage (protobuf camelCase), which
// is what handleData now receives — not LTC's snake_case JSON export.

// Stands in for the protobuf Long that 64-bit fields decode to. handleData relies
// on Long stringifying to its decimal value, so this reproduces the only property
// of Long that matters here.
function long(value) {
    return { toString: () => String(value) };
}

function makeVehicleFeed({ statusCode, stopId, timestamp = 1000, occupancy = true }) {
    const vehicle = {
        trip: { routeId: 'RTEST', tripId: 'TRIP_A' },
        position: { latitude: 42.98, longitude: -81.23, bearing: 90 },
        vehicle: { id: 'BUS_TEST_1' },
        stopId,
        currentStatus: statusCode,
    };

    // Omitted entirely when the feed did not report it, so the absent-vs-zero
    // distinction stays testable.
    if (occupancy) {
        vehicle.occupancyStatus = 1;
        vehicle.occupancyPercentage = 50;
    }

    return { header: { timestamp: long(timestamp) }, entity: [{ vehicle }] };
}

function makeTripFeed({ timestamp = 1000 } = {}) {
    return {
        header: { timestamp: long(timestamp) },
        entity: [
            {
                tripUpdate: {
                    trip: { tripId: 'TRIP_A', routeId: 'RTEST' },
                    stopTimeUpdate: [
                        { stopId: 'STOP_TEST_A', arrival: { time: long(1500), delay: 30 } },
                        { stopId: 'STOP_TEST_B', arrival: { time: long(1600), delay: 10 } },
                    ],
                },
            },
        ],
    };
}

beforeEach(() => {
    latestVehicleData.clear();
    latestArrivalData.clear();
});

test('handleData: IN_TRANSIT_TO (status 2) reports the current stopId as the destination', async () => {
    const vehicleFeed = makeVehicleFeed({ statusCode: 2, stopId: 'STOP_TEST_A' });
    const tripFeed = makeTripFeed();

    await handleData(vehicleFeed, tripFeed);

    const vehicles = latestVehicleData.get('RTEST');
    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0].Destination, 'STOP_TEST_A');
    assert.equal(vehicles[0].VehicleId, 'BUS_TEST_1');
    assert.equal(vehicles[0].RouteId, 'RTEST');
});

test('handleData: STOPPED_AT (status 1) advances the destination to the next stop in sequence', async () => {
    const vehicleFeed = makeVehicleFeed({ statusCode: 1, stopId: 'STOP_TEST_A' });
    const tripFeed = makeTripFeed();

    await handleData(vehicleFeed, tripFeed);

    const vehicles = latestVehicleData.get('RTEST');
    assert.equal(vehicles[0].Destination, 'STOP_TEST_B');
});

test('handleData: groups and sorts arrivals per stop, keyed by stopId', async () => {
    const vehicleFeed = makeVehicleFeed({ statusCode: 2, stopId: 'STOP_TEST_A' });
    const tripFeed = makeTripFeed();

    await handleData(vehicleFeed, tripFeed);

    const arrivalsA = latestArrivalData.get('STOP_TEST_A');
    assert.equal(arrivalsA.length, 1);
    assert.equal(arrivalsA[0].arrivalTime, 1500);
    assert.equal(arrivalsA[0].delaySeconds, 30);

    const arrivalsB = latestArrivalData.get('STOP_TEST_B');
    assert.equal(arrivalsB.length, 1);
    assert.equal(arrivalsB[0].arrivalTime, 1600);
});

test('handleData: emits a VEHICLE_UPDATE_<routeId> event with the vehicle batch', async () => {
    const vehicleFeed = makeVehicleFeed({ statusCode: 2, stopId: 'STOP_TEST_A' });
    const tripFeed = makeTripFeed();

    const received = await new Promise((resolve) => {
        eventEmitter.once('VEHICLE_UPDATE_RTEST', resolve);
        handleData(vehicleFeed, tripFeed);
    });

    assert.equal(received.length, 1);
    assert.equal(received[0].VehicleId, 'BUS_TEST_1');
});

test('handleData: converts protobuf Long timestamps to plain numbers', async () => {
    // GraphQL declares these as Int; a Long object would break serialization.
    const vehicleFeed = makeVehicleFeed({ statusCode: 2, stopId: 'STOP_TEST_A', timestamp: 1786564891 });
    const tripFeed = makeTripFeed({ timestamp: 1786564891 });

    await handleData(vehicleFeed, tripFeed);

    const vehicle = latestVehicleData.get('RTEST')[0];
    assert.equal(typeof vehicle.timestamp, 'number');
    assert.equal(vehicle.timestamp, 1786564891);

    const arrival = latestArrivalData.get('STOP_TEST_A')[0];
    assert.equal(typeof arrival.timestamp, 'number');
    assert.equal(arrival.timestamp, 1786564891);
    assert.equal(typeof arrival.arrivalTime, 'number');
    assert.equal(arrival.arrivalTime, 1500);
});

test('handleData: reports unreported occupancy as null rather than zero', async () => {
    // Unset proto2 fields read back as 0, which would present an unreported bus
    // as a confidently empty one. Absence has to survive as null.
    const vehicleFeed = makeVehicleFeed({ statusCode: 2, stopId: 'STOP_TEST_A', occupancy: false });

    await handleData(vehicleFeed, makeTripFeed());

    const vehicle = latestVehicleData.get('RTEST')[0];
    assert.equal(vehicle.occupancy_status, null);
    assert.equal(vehicle.occupancy_percentage, null);
});

test('handleData: passes through occupancy the feed did report', async () => {
    const vehicleFeed = makeVehicleFeed({ statusCode: 2, stopId: 'STOP_TEST_A' });

    await handleData(vehicleFeed, makeTripFeed());

    const vehicle = latestVehicleData.get('RTEST')[0];
    assert.equal(vehicle.occupancy_status, 1);
    assert.equal(vehicle.occupancy_percentage, 50);
});
