// INPUTS:
// - stopId: string like "ADELADA1"
// - tripUpdates: parsed TripUpdates.json
// - stopsData: parsed Stops.json

export function getArrivalsForStop(stopId, tripUpdates, stopsData) {
    const arrivals = [];

    for (const entity of tripUpdates.entity) {
        const trip = entity.trip_update;
        if (!trip || !trip.stop_time_update) continue;

        for (const stopTime of trip.stop_time_update) {
            if (stopTime.stop_id === stopId) {
                arrivals.push({
                    routeId: trip.trip.route_id,
                    tripId: trip.trip.trip_id,
                    arrivalTime: stopTime.arrival?.time ?? null,
                    delaySeconds: stopTime.arrival?.delay ?? 0
                });
            }
        }
    }

    // Optional: sort by soonest arrival
    arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);

    return arrivals;
}
