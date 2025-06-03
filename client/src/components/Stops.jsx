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

        // Clear previous markers
        markersRef.current.forEach(marker => marker.map = null);
        markersRef.current = [];
        
        
        stopData.forEach((stop) => {
            
            // Is the stop in the routes selected?
            const shouldDisplay =
                routeIds.length === 0 ||
                stop.routes.some(stopRoute => {
                    // for if route is 1A 1B etc - match it with ids 1, 2, etc
                    const match = stopRoute.match(/^\d+/)
                    const normalizedStopRoute = match[0];
                    return routeIds.some(rid => {
                        const normalizedRid = parseInt(rid, 10).toString();
                        return (
                            normalizedStopRoute.startsWith(normalizedRid) &&
                            (
                                normalizedStopRoute.length === normalizedRid.length ||
                                /^[A-Za-z]+$/.test(normalizedStopRoute.slice(normalizedRid.length))
                            )
                        );
                    });
                });


            if (!shouldDisplay) return;

            const [lat, lng] = stop.coordinates;

            const marker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position: { lat, lng },
                title: stop.name,
                content: createStopPin(),
            });

            markersRef.current.push(marker);
        });



        return () => {
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
    pin.style.backgroundColor = '#000';
    pin.style.border = '2px solid white';
    pin.style.boxShadow = '0 0 2px rgba(0,0,0,0.5)';
    return pin;
}

export default Stops;
