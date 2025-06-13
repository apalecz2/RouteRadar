import { useEffect, useState } from 'react';
import { getArrivalsForStop } from './getArrivalsForStop';
import { getUpcomingStopsForVehicle } from './getUpcomingStopsForVehicle';

function formatArrivalTime(unixTime) {
  const date = new Date(unixTime * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const Arrivals = () => {
  const [stops, setStops] = useState([]);
  const [tripUpdates, setTripUpdates] = useState(null);
  const [vehiclePositions, setVehiclePositions] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stopsRes, tripsRes, vehiclesRes] = await Promise.all([
          fetch('/stops.json'),
          fetch('/TripUpdates.json'),
          fetch('/VehiclePositions.json')
        ]);

        const [stopsData, tripsData, vehiclesData] = await Promise.all([
          stopsRes.json(),
          tripsRes.json(),
          vehiclesRes.json()
        ]);

        setStops(stopsData);
        setTripUpdates(tripsData);
        setVehiclePositions(vehiclesData);
      } catch (err) {
        console.error('Error loading JSON files:', err);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!stops.length || !tripUpdates || !vehiclePositions) return;

    const stopArrivals = getArrivalsForStop("ADELADA1", tripUpdates, stops);
    console.log("Arrivals at stop:", stopArrivals.map(a => ({
      ...a,
      arrivalFormatted: formatArrivalTime(a.arrivalTime)
    })));

    const vehicle = vehiclePositions.entity.find(v => v.vehicle.vehicle.id === "3027");
    const nextStops = getUpcomingStopsForVehicle(vehicle, tripUpdates, stops);
    console.log("Upcoming stops for bus 3027:", nextStops.map(s => ({
      ...s,
      arrivalFormatted: formatArrivalTime(s.arrivalTime)
    })));
  }, [stops, tripUpdates, vehiclePositions]);

  return (
    <div>
      <h1>Test</h1>
    </div>
  );
};

export default Arrivals;
