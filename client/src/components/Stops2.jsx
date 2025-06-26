import { useEffect, useRef, useState, useMemo } from 'react';

import StopPopup from './StopPopup';


// Helper to process the json files into maps for quick access after initial load
const processStops = (stops) => {
    const stopsById = new Map(); // Map<stop_id, stop>
    const stopsByRoute = new Map(); // Map<route_id, Set<stop_id>>

    for (const stop of stops) {
        stopsById.set(stop.stop_id, stop);
        

        for (let route of stop.routes) {
            // Extract the route number, disregard the A, B suffix
            route = route.match(/^\d+/)[0]
            
            if (!stopsByRoute.has(route)) {
                stopsByRoute.set(route, new Set());
            }
            stopsByRoute.get(route).add(stop.stop_id);
        }
    }

    return { stopsById, stopsByRoute };
};

const useStops = () => {
    const [stopsById, setStopsById] = useState(new Map());
    const [stopsByRoute, setStopsByRoute] = useState(new Map());

    useEffect(() => {
        const fetchStops = async () => {
            const res = await fetch("/stops.json");
            const data = await res.json();
            const { stopsById, stopsByRoute } = processStops(data);

            setStopsById(stopsById);
            setStopsByRoute(stopsByRoute);
        };

        fetchStops();
    }, []);

    return { stopsById, stopsByRoute };
};

const getStopsForRoutes = (routeIds, stopsById, stopsByRoute) => {
    const stopIds = new Set();

    for (const routeId of routeIds) {
        const idsForRoute = stopsByRoute.get(routeId);
        if (idsForRoute) {
            idsForRoute.forEach(stopIds.add, stopIds);
        }
    }

    const stops = [];
    for (const stopId of stopIds) {
        const stop = stopsById.get(stopId);
        if (stop) stops.push(stop);
    }

    return stops;
};

function createStopPin(colour = '#ffffff') {
    const pin = document.createElement('div');
    pin.style.width = '12px';
    pin.style.height = '12px';
    pin.style.borderRadius = '50%';
    pin.style.backgroundColor = colour;
    pin.style.border = '2px solid black';
    pin.style.boxShadow = '0 0 2px rgba(0,0,0,0.5)';
    // Vertically align
    pin.style.transform = 'translateY(50%)'
    return pin;
}


const Stops2 = ({ map, routeIds }) => {
    
    const [selectedStop, setSelectedStop] = useState(null);

    const { stopsById, stopsByRoute } = useStops();

    const markersRef = useRef(new Map());
    
    // Track the selected marker to reset colour after another is clicked etc
    const selectedMarkerRef = useRef(null);

    const visibleStopIds = useMemo(() => {
        const stopIds = new Set();
        // If no routeIds provided, include ALL stop IDs
        if (!routeIds || routeIds.length === 0) {
            // No this makes it take so long to load. it does look cool though
            /*
            for (const stopId of stopsById.keys()) {
                stopIds.add(stopId);
            }
                */
        } else {
            for (const routeId of routeIds) {
                const idsForRoute = stopsByRoute.get(routeId);
                if (idsForRoute) {
                    idsForRoute.forEach((id) => stopIds.add(id));
                }
            }
        }
        return stopIds;
    }, [routeIds, stopsByRoute]);

    useEffect(() => {
        console.log(routeIds)
        if (!map || stopsById.size === 0 || stopsByRoute.size === 0) return;

        // Add new markers that aren't already present
        visibleStopIds.forEach((stopId) => {
            if (!markersRef.current.has(stopId)) {
                const stop = stopsById.get(stopId);
                if (!stop) return;

                const marker = new google.maps.marker.AdvancedMarkerElement({
                    position: {
                        lat: stop.coordinates[0],
                        lng: stop.coordinates[1],
                    },
                    map: map,
                    title: stop.name,
                    content: createStopPin(),
                });
                
                marker.addListener('click', () => {
                    // Reset previously selected marker
                    if (selectedMarkerRef.current) {
                        selectedMarkerRef.current.content = createStopPin();
                    }
                    
                    // Change the marker's content to a new pin with a different color
                    marker.content = createStopPin('#ff0000'); // red on click
                    selectedMarkerRef.current = marker;
                    
                    setSelectedStop(stop);
                });

                markersRef.current.set(stopId, marker);
            }
        });

        // Remove markers that are no longer needed
        for (const [stopId, marker] of markersRef.current.entries()) {
            if (!visibleStopIds.has(stopId)) {
                marker.map = null; // remove from map
                markersRef.current.delete(stopId);
            }
        }
    }, [map, visibleStopIds, stopsById, stopsByRoute]);

    return <StopPopup stop={selectedStop} onClose={() => {
        setSelectedStop(null);
        selectedMarkerRef.current.content = createStopPin();
    }} />;




}


export default Stops2;
