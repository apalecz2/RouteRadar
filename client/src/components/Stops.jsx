import { useEffect, useRef, useState } from 'react';

const Stops = ({ map, routeIds }) => {
    const markersRef = useRef([]);
    const [stopData, setStopData] = useState([]);

    useEffect(() => {
        const fetchStops = async () => {
            try {
                const response = await fetch('/stops.json');
                const data = await response.json();
                setStopData(data);
            } catch (err) {
                console.error('Failed to load stop data:', err);
            }
        };

        fetchStops();
    }, []);

    useEffect(() => {
        if (!map || stopData.length === 0 || !google.maps.marker?.AdvancedMarkerElement) return;

        const matchesRoute = (stop) => {
            return routeIds.length === 0 || stop.routes.some(route => {
                const match = route.match(/^\d+/);
                const normalizedStopRoute = match?.[0];
                return routeIds.some(rid => {
                    const normalizedRid = parseInt(rid, 10).toString();
                    return (
                        normalizedStopRoute?.startsWith(normalizedRid) &&
                        (
                            normalizedStopRoute.length === normalizedRid.length ||
                            /^[A-Za-z]+$/.test(normalizedStopRoute.slice(normalizedRid.length))
                        )
                    );
                });
            });
        };

        const updateVisibleMarkers = () => {
            const zoom = map.getZoom();
            const bounds = map.getBounds();
            if (!bounds || zoom < 14) {
                // Hide all markers if zoomed out too far
                markersRef.current.forEach(marker => marker.map = null);
                return;
            }

            // Clear existing markers
            markersRef.current.forEach(marker => marker.map = null);
            markersRef.current = [];

            const visibleStops = stopData.filter(stop => {
                const [lat, lng] = stop.coordinates;
                const inBounds = bounds.contains(new google.maps.LatLng(lat, lng));
                const onRoute = matchesRoute(stop);
                return inBounds && onRoute;
            });

            const infoWindow = new google.maps.InfoWindow();

visibleStops.forEach(stop => {
    const [lat, lng] = stop.coordinates;

    const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: stop.name,
        content: createStopPin(),
    });

    marker.addListener('click', () => {
        const content = `
            <div style="padding: 8px; max-width: 200px;">
                <strong>${stop.name}</strong><br/>
                <strong>${stop.stop_id}</strong><br/>
                <span>Routes: ${stop.routes.join(', ')}</span>
            </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
    });

    markersRef.current.push(marker);
});
        };

        const idleListener = google.maps.event.addListener(map, 'idle', updateVisibleMarkers);
        updateVisibleMarkers(); // Initial run

        return () => {
            google.maps.event.removeListener(idleListener);
            markersRef.current.forEach(marker => marker.map = null);
        };
    }, [map, stopData, routeIds]);

    return null;
};

function createStopPin() {
    const pin = document.createElement('div');
    pin.style.width = '10px';
    pin.style.height = '10px';
    pin.style.borderRadius = '50%';
    pin.style.backgroundColor = '#fff';
    pin.style.border = '2px solid black';
    pin.style.boxShadow = '0 0 2px rgba(0,0,0,0.5)';
    return pin;
}

export default Stops;
