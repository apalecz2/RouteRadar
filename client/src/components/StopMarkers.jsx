// This component only places the stop markers based on the passed route selection, 
// attaches click listeners, to pass the stop clicked to the parent


import { useEffect, useMemo, useRef, useState } from 'react';

// Helper to process json into maps for quick access
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
            const res = await fetch('/stops.json');
            const data = await res.json();
            const { stopsById, stopsByRoute } = processStops(data);
            setStopsById(stopsById);
            setStopsByRoute(stopsByRoute);
        };
        fetchStops();
    }, []);
    return { stopsById, stopsByRoute };
};

// Creates the pin, exports to be called in parent to add and remove highlight and ping
export function createStopPin(colour = '#ffffff', withPing = false) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '12px';
    wrapper.style.height = '12px';

    if (withPing) {
        const ping = document.createElement('div');
        ping.className = 'stop-ping'; // From in index.css
        wrapper.appendChild(ping);
    }

    const pin = document.createElement('div');
    pin.style.width = '12px';
    pin.style.height = '12px';
    pin.style.borderRadius = '50%';
    pin.style.backgroundColor = colour;
    pin.style.border = '2px solid black';
    pin.style.boxShadow = '0 0 2px rgba(0,0,0,0.5)';
    pin.style.position = 'absolute';
    pin.style.top = '0';
    pin.style.left = '0';

    wrapper.appendChild(pin);
    wrapper.style.transform = 'translateY(50%)';
    return wrapper;
}





// Based on the route selection, display the stops for the selection
// Attach listeners to each marker, and pass to parent
const StopMarkers = ({ map, routeIds, stopClicked, registerPinCreator }) => {

    const { stopsById, stopsByRoute } = useStops();
    const markersRef = useRef(new Map());
    
    // Tell the parent where to call to create a pin
    useEffect(() => {
        registerPinCreator('stop', createStopPin);
    }, [registerPinCreator]);
    

    const visibleStopIds = useMemo(() => {
        const stopIds = new Set();
        if (routeIds && routeIds.length > 0) {
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
        
        // Validate that stop markers can / should be placed
        if (!map || stopsById.size === 0 || stopsByRoute.size === 0) return;
        // Add new markers
        visibleStopIds.forEach((stopId) => {
            if (!markersRef.current.has(stopId)) {
                const stop = stopsById.get(stopId);
                if (!stop) return;

                const marker = new google.maps.marker.AdvancedMarkerElement({
                    position: {
                        lat: stop.coordinates[0],
                        lng: stop.coordinates[1],
                    },
                    map,
                    title: stop.name,
                    content: createStopPin(),
                });

                marker.addListener('click', () => {
                    // Pass to parent
                    stopClicked(stop, 'stop', marker);
                });

                markersRef.current.set(stopId, marker);
            }
        });

        // Remove old markers
        for (const [stopId, marker] of markersRef.current.entries()) {
            if (!visibleStopIds.has(stopId)) {
                marker.map = null;
                markersRef.current.delete(stopId);
            }
        }

    }, [map, visibleStopIds, stopsById, stopsByRoute, stopClicked]);


    useEffect(() => {
        // Cleanup all markers on unmount
        return () => {
            for (const marker of markersRef.current.values()) {
                marker.map = null;
            }
            markersRef.current.clear();
        };
    }, []);

    return null;

}

export default StopMarkers;