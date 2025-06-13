// INPUTS:
// - vehicle: single entry from VehiclePositions.entity[x]
// - tripUpdates: parsed TripUpdates.json
// - stopsData: parsed Stops.json

export function getUpcomingStopsForVehicle(vehicle, tripUpdates, stopsData) {
    const tripId = vehicle.vehicle?.trip?.trip_id;
    const currentSeq = vehicle.vehicle?.current_stop_sequence;

    const trip = tripUpdates.entity.find(e => e.trip_update?.trip?.trip_id === tripId);
    if (!trip || !trip.trip_update || !trip.trip_update.stop_time_update) return [];

    const upcomingStops = trip.trip_update.stop_time_update
        .filter(stop => stop.stop_sequence > currentSeq)
        .map(stop => {
            const stopInfo = stopsData.find(s => s.stop_id === stop.stop_id);
            return {
                stopId: stop.stop_id,
                stopName: stopInfo?.name ?? stop.stop_id,
                arrivalTime: stop.arrival?.time ?? null,
                delaySeconds: stop.arrival?.delay ?? 0,
                stopSequence: stop.stop_sequence
            };
        });

    return upcomingStops;
}
