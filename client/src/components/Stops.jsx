import { useEffect, useRef, useState } from 'react';
import { gql, useSubscription } from '@apollo/client';

const STOP_UPDATES_SUB = gql`
  subscription($stopId: String!) {
    stopUpdates(stopId: $stopId) {
      stopId
      routeId
      tripId
      arrivalTime
      delaySeconds
    }
  }
`;

function formatTime(unixSeconds) {
    const date = new Date(unixSeconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const Stops = ({ map, routeIds }) => {
    const markersRef = useRef([]);
    const infoWindowRef = useRef(new google.maps.InfoWindow());

    const [stopData, setStopData] = useState([]);
    const [selectedStopId, setSelectedStopId] = useState(null);
    const [selectedStopData, setSelectedStopData] = useState(null);

    const { data: stopDataLive } = useSubscription(STOP_UPDATES_SUB, {
        variables: { stopId: selectedStopId },
        skip: !selectedStopId,
    });

    // Load static stop data
    useEffect(() => {
        const fetchStops = async () => {
            try {
                const res = await fetch('/stops.json');
                const data = await res.json();
                setStopData(data);
            } catch (err) {
                console.error('Failed to load stops:', err);
            }
        };
        fetchStops();
    }, []);

    // Display and filter markers
    useEffect(() => {
        if (!map || stopData.length === 0 || !google.maps.marker?.AdvancedMarkerElement) return;

        const matchesRoute = (stop) =>
            routeIds.length === 0 || stop.routes.some(route => {
                const match = route.match(/^\d+/);
                const normalizedRoute = match?.[0];
                return routeIds.some(id => normalizedRoute?.startsWith(parseInt(id).toString()));
            });

        const renderMarkers = () => {
            const zoom = map.getZoom();
            const bounds = map.getBounds();
            if (!bounds || zoom < 14) {
                markersRef.current.forEach(marker => marker.map = null);
                return;
            }

            markersRef.current.forEach(marker => marker.map = null);
            markersRef.current = [];

            stopData.forEach(stop => {
                if (!matchesRoute(stop)) return;

                const [lat, lng] = stop.coordinates;
                if (!bounds.contains(new google.maps.LatLng(lat, lng))) return;

                const marker = new google.maps.marker.AdvancedMarkerElement({
                    map,
                    position: { lat, lng },
                    title: stop.name,
                    content: createStopPin(),
                });

                marker.addListener('click', () => {
                    setSelectedStopId(stop.stop_id);
                    setSelectedStopData(stop);
                    infoWindowRef.current.setContent('<div>Loading...</div>');
                    infoWindowRef.current.open(map, marker);
                });

                markersRef.current.push(marker);
            });
        };

        const idleListener = google.maps.event.addListener(map, 'idle', renderMarkers);
        renderMarkers(); // Initial render

        return () => {
            google.maps.event.removeListener(idleListener);
            markersRef.current.forEach(marker => marker.map = null);
        };
    }, [map, stopData, routeIds]);

    // Update info window content with live data
    useEffect(() => {
        if (!stopDataLive || !selectedStopData || !infoWindowRef.current) return;

        const seen = new Set();
        const arrivals = stopDataLive.stopUpdates
            .filter(update => {
                const key = `${update.tripId}_${update.arrivalTime}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => a.arrivalTime - b.arrivalTime)
            .slice(0, 3);

        const arrivalHTML = arrivals.length
            ? `<ul style="padding-left: 16px;">${arrivals.map(a =>
                `<li>${formatTime(a.arrivalTime)} - Route ${a.routeId} - Bus ${a.tripId}</li>`
            ).join('')}</ul>`
            : '<div>No upcoming arrivals</div>';

        const content = `
      <div style="padding: 8px; max-width: 250px;">
        <strong>${selectedStopData.name}</strong><br/>
        <span>Stop ID: ${selectedStopData.stop_id}</span><br/>
        <span>Routes: ${selectedStopData.routes.join(', ')}</span><br/>
        <hr />
        <strong>Live Arrivals:</strong><br/>
        ${arrivalHTML}
      </div>
    `;

        infoWindowRef.current.setContent(content);
    }, [stopDataLive, selectedStopData]);

    return null;
};

function createStopPin() {
    const pin = document.createElement('div');
    pin.style.width = '12px';
    pin.style.height = '12px';
    pin.style.borderRadius = '50%';
    pin.style.backgroundColor = '#ffffff';
    pin.style.border = '2px solid black';
    pin.style.boxShadow = '0 0 2px rgba(0,0,0,0.5)';
    return pin;
}

export default Stops;
