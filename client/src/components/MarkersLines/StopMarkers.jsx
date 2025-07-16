// This component only places the stop markers based on the passed route selection, 
// attaches click listeners, to pass the stop clicked to the parent


import { useEffect, useMemo, useRef } from 'react';
import { useData } from '../Providers/DataProvider';

// Helper to process json into maps for quick access
const processStops = (stops) => {
    const stopsById = new Map(); // Map<stop_id, stop>
    const stopsByRoute = new Map(); // Map<route_id, Set<stop_id>>

    for (const stop of stops) {
        stopsById.set(stop.stop_id, stop);

        for (let route of stop.routes) {
            // Extract the route number, disregard the A, B suffix
            route = route.match(/^[0-9]+/)[0]
            if (!stopsByRoute.has(route)) {
                stopsByRoute.set(route, new Set());
            }
            stopsByRoute.get(route).add(stop.stop_id);
        }
    }

    return { stopsById, stopsByRoute };
};

// Creates the pin, exports to be called in parent to add and remove highlight and ping
export function createStopPin(colour = '#ffffff', withPing = false) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '12px';
    wrapper.style.height = '12px';
    wrapper.style.transform = 'translateY(50%)';

    // Helper to clear ping if it exists
    function clearPing() {
        const existingPing = wrapper.querySelector('.bus-ping');
        if (existingPing) wrapper.removeChild(existingPing);
    }

    // Helper to add ping
    function addPing(color) {
        clearPing();
        const ping = document.createElement('div');
        ping.className = 'bus-ping';
        ping.style.background = color;
        wrapper.appendChild(ping);
    }

    // Initial ping
    if (withPing) {
        addPing(colour);
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

    // Attach update method for highlight/ping
    wrapper._updatePin = (color, _rotation, pingActive) => {
        pin.style.backgroundColor = color;
        if (pingActive) {
            addPing(color);
        } else {
            clearPing();
        }
    };
    wrapper._color = colour;
    wrapper._withPing = withPing;

    return wrapper;
}

// Based on the route selection, display the stops for the selection
// Attach listeners to each marker, and pass to parent
const StopMarkers = ({ map, routeIds, stopClicked, registerPinCreator }) => {
    const { stops, loading, error } = useData();
    const markersRef = useRef(new Map());

    // Tell the parent where to call to create a pin
    useEffect(() => {
        registerPinCreator('stop', createStopPin);
    }, [registerPinCreator]);

    // Memoize processed stops
    const { stopsById, stopsByRoute } = useMemo(() => {
        if (!stops || stops.length === 0) return { stopsById: new Map(), stopsByRoute: new Map() };
        return processStops(stops);
    }, [stops]);

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
                    zIndex: 10, // Stop markers base zIndex
                });
                marker._baseZIndex = 10;
                marker.setZIndex = function(z) { this.zIndex = z; this.element && (this.element.style.zIndex = z); this.zIndex = z; };

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