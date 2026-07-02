import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleData } from '../src/services/pollingService.js';
import { eventEmitter, latestVehicleData, latestArrivalData } from '../src/state.js';

function makeVehicleJson({ statusCode, stopId, timestamp = 1000 }) {
    return {
        header: { timestamp },
        entity: [
            {
                vehicle: {
                    trip: { route_id: 'RTEST', trip_id: 'TRIP_A' },
                    position: { latitude: 42.98, longitude: -81.23, bearing: 90 },
                    vehicle: { id: 'BUS_TEST_1' },
                    stop_id: stopId,
                    current_status: statusCode,
                    occupancy_status: 1,
                    occupancy_percentage: 50,
                },
            },
        ],
    };
}

function makeTripJson({ timestamp = 1000 } = {}) {
    return {
        header: { timestamp },
        entity: [
            {
                trip_update: {
                    trip: { trip_id: 'TRIP_A', route_id: 'RTEST' },
                    stop_time_update: [
                        { stop_id: 'STOP_TEST_A', arrival: { time: 1500, delay: 30 } },
                        { stop_id: 'STOP_TEST_B', arrival: { time: 1600, delay: 10 } },
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

test('handleData: IN_TRANSIT_TO (status 2) reports the current stop_id as the destination', async () => {
    const vehicleJson = makeVehicleJson({ statusCode: 2, stopId: 'STOP_TEST_A' });
    const tripJson = makeTripJson();

    await handleData(vehicleJson, tripJson);

    const vehicles = latestVehicleData.get('RTEST');
    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0].Destination, 'STOP_TEST_A');
    assert.equal(vehicles[0].VehicleId, 'BUS_TEST_1');
    assert.equal(vehicles[0].RouteId, 'RTEST');
});

test('handleData: STOPPED_AT (status 1) advances the destination to the next stop in sequence', async () => {
    const vehicleJson = makeVehicleJson({ statusCode: 1, stopId: 'STOP_TEST_A' });
    const tripJson = makeTripJson();

    await handleData(vehicleJson, tripJson);

    const vehicles = latestVehicleData.get('RTEST');
    assert.equal(vehicles[0].Destination, 'STOP_TEST_B');
});

test('handleData: groups and sorts arrivals per stop, keyed by stopId', async () => {
    const vehicleJson = makeVehicleJson({ statusCode: 2, stopId: 'STOP_TEST_A' });
    const tripJson = makeTripJson();

    await handleData(vehicleJson, tripJson);

    const arrivalsA = latestArrivalData.get('STOP_TEST_A');
    assert.equal(arrivalsA.length, 1);
    assert.equal(arrivalsA[0].arrivalTime, 1500);
    assert.equal(arrivalsA[0].delaySeconds, 30);

    const arrivalsB = latestArrivalData.get('STOP_TEST_B');
    assert.equal(arrivalsB.length, 1);
    assert.equal(arrivalsB[0].arrivalTime, 1600);
});

test('handleData: emits a VEHICLE_UPDATE_<routeId> event with the vehicle batch', async () => {
    const vehicleJson = makeVehicleJson({ statusCode: 2, stopId: 'STOP_TEST_A' });
    const tripJson = makeTripJson();

    const received = await new Promise((resolve) => {
        eventEmitter.once('VEHICLE_UPDATE_RTEST', resolve);
        handleData(vehicleJson, tripJson);
    });

    assert.equal(received.length, 1);
    assert.equal(received[0].VehicleId, 'BUS_TEST_1');
});
