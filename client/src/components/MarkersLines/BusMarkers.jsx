// This component subscribes to routes based the passed selection for bus locations
// it creates the markers for these buses and passed the click handler to the parent to assign highlight and popups from there


import { useEffect, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { createRoot } from 'react-dom/client';
import subscriptionManager from '../../utils/subscriptionManager';
import { BusPin } from '../Pins/BusPin';
import { getRouteColor } from '../../utils/getRouteColor';
import { useData } from '../Providers/DataProvider';


// Export to allow calls from parent to set and reset highlight when it's selected or deselected
// (Moved to BusPin.jsx)

// Wrapper function to create a DOM element from the React BusPin component
function createBusPinWrapper(initialColor = 'white', initialRotation = 0, initialPing = false) {
    const wrapper = document.createElement('div');
    const root = createRoot(wrapper);

    // Mutable props ref
    let props = {
        color: initialColor,
        rotation: initialRotation,
        withPing: initialPing
    };

    // A tiny wrapper component to rerender on prop update
    function PinWrapper() {
        return <BusPin {...props} />;
    }

    root.render(<PinWrapper />);

    return {
        element: wrapper,
        update: (color, rotation, withPing) => {
            props.color = color;
            props.rotation = rotation;
            props.withPing = withPing;
            root.render(<PinWrapper />);
        }
    };
}



const STALE_THRESHOLD_SECONDS = 90; // 1.5 minutes

const BusMarkers = ({ routeIds, map, busClicked, registerPinCreator, updateSelectionData }) => {

    const client = useApolloClient();
    const { routes } = useData();

    const markersRef = useRef({});
    const routeToVehicleMap = useRef({});
    const subscriptionIdsRef = useRef({});
    const lastUpdateRef = useRef(Date.now());

    // Tell the parent where to call to make pin
    useEffect(() => {
        registerPinCreator?.('bus', (color, rotation, withPing) => {
            const { element, update } = createBusPinWrapper(color, rotation, withPing);
            // Expose update method through element so parent can use it
            element._updatePin = update;
            element._color = color;
            element._rotation = rotation;
            element._withPing = withPing;
            return element;
        });
    }, [registerPinCreator]);

    // Periodically prune stale markers
    useEffect(() => {
        const intervalId = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);

            Object.keys(markersRef.current).forEach(vehicleId => {
                const marker = markersRef.current[vehicleId];
                if (!marker || !marker.vehicleData) return;

                const age = now - marker.vehicleData.timestamp;
                if (age > STALE_THRESHOLD_SECONDS) {
                    console.log(`Removing stale bus marker ${vehicleId} (age: ${age}s)`);
                    marker.map = null;
                    delete markersRef.current[vehicleId];

                    // Also remove from routeToVehicleMap to keep it clean
                    // This is a bit inefficient (linear search per vehicle) but number of routes per user selection is small
                    Object.values(routeToVehicleMap.current).forEach(vehicleSet => {
                        if (vehicleSet.has(vehicleId)) {
                            vehicleSet.delete(vehicleId);
                        }
                    });
                }
            });
        }, 5000); // Check every 5 seconds

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        // Set the Apollo client in the subscription manager
        subscriptionManager.setClient(client);

        // Validate map reference
        if (!map || !window.google?.maps) return;
        const AdvancedMarkerElement = window.google.maps.marker?.AdvancedMarkerElement;
        if (!AdvancedMarkerElement) return;

        let activeRouteIds = routeIds;
        if (routeIds.length === 0 && routes && routes.length > 0) {
            activeRouteIds = routes.map(r => r.id);
        }

        const newRoutes = new Set(activeRouteIds.map(String));
        const currentRoutes = new Set(Object.keys(subscriptionIdsRef.current));

        const routesToRemove = [...currentRoutes].filter(r => !newRoutes.has(r));
        const routesToAdd = [...newRoutes].filter(r => !currentRoutes.has(r));

        // Unsubscribe and remove old routes
        for (const route of routesToRemove) {
            const subscriptionId = subscriptionIdsRef.current[route];
            if (subscriptionId) {
                subscriptionManager.unsubscribeCompletely(subscriptionId);
                delete subscriptionIdsRef.current[route];
            }

            const vehicleIds = routeToVehicleMap.current[route] || new Set();
            for (const id of vehicleIds) {
                if (markersRef.current[id]) {
                    markersRef.current[id].map = null;
                    delete markersRef.current[id];
                }
            }
            delete routeToVehicleMap.current[route];
        }

        // Subscribe to new routes
        for (const routeId of routesToAdd) {
            routeToVehicleMap.current[routeId] = new Set();

            const subscriptionId = subscriptionManager.subscribeToVehicle(routeId, {
                onNext: ({ data }) => {
                    lastUpdateRef.current = Date.now();
                    const vehicle = data?.vehicleUpdates;
                    if (!vehicle) return;

                    // Check if update is stale immediately
                    const now = Math.floor(Date.now() / 1000);
                    if (vehicle.timestamp && (now - vehicle.timestamp > STALE_THRESHOLD_SECONDS)) {
                        // If marker exists, remove it because update is stale
                        if (markersRef.current[vehicle.VehicleId]) {
                            markersRef.current[vehicle.VehicleId].map = null;
                            delete markersRef.current[vehicle.VehicleId];
                        }
                        return;
                    }

                    const id = vehicle.VehicleId;
                    const pos = { lat: vehicle.Latitude, lng: vehicle.Longitude };
                    const rotation = vehicle.Bearing || 0;
                    // Determine color from getRouteColor
                    let color = 'white';
                    if (routes && routes.length > 0 && vehicle.RouteId) {
                        const routeIndex = routes.findIndex(r => String(r.id) === String(vehicle.RouteId));
                        if (routeIndex !== -1) {
                            color = getRouteColor(routeIndex);
                        }
                    }

                    routeToVehicleMap.current[routeId].add(id);

                    const existingMarker = markersRef.current[id];
                    if (existingMarker) {
                        // Update position
                        existingMarker.position = pos;
                        existingMarker.vehicleData = vehicle;

                        // Always re-render the BusPin with the new rotation and color
                        const needsUpdate =
                            existingMarker._rotation !== rotation ||
                            existingMarker._color !== color ||
                            existingMarker._withPing !== false;

                        if (needsUpdate && existingMarker._updatePin) {
                            existingMarker._updatePin(color, rotation, false);
                            existingMarker._rotation = rotation;
                            existingMarker._color = color;
                            existingMarker._withPing = false;
                            if (existingMarker.content) {
                                existingMarker.content.__pinColor = color;
                                existingMarker.content.__pinRotation = rotation;
                                existingMarker.content.__pinPing = false;
                            }
                        }

                        // Update selection data if this bus is currently selected
                        updateSelectionData?.(id, vehicle);
                    } else {
                        // Create new marker
                        const { element, update } = createBusPinWrapper(color, rotation, false);
                        const marker = new AdvancedMarkerElement({
                            position: pos,
                            map,
                            //title: vehicle.Destination,
                            content: element,
                            zIndex: 20, // Bus markers base zIndex
                        });
                        marker._baseZIndex = 20;
                        marker.vehicleData = vehicle;
                        marker._updatePin = update;
                        marker._rotation = rotation;
                        marker._color = color;
                        marker._withPing = false;
                        // Set custom properties for highlight logic
                        element.__pinColor = color;
                        element.__pinRotation = rotation;
                        element.__pinPing = false;

                        marker.addListener('click', () => {
                            busClicked(marker.vehicleData, 'bus', marker);
                        });

                        markersRef.current[id] = marker;
                    }
                },
                onError: (error) => {
                    console.error(`Error in vehicle subscription for route ${routeId}:`, error);
                },
                onComplete: () => {
                    console.log(`Vehicle subscription completed for route ${routeId}`);
                }
            });

            subscriptionIdsRef.current[routeId] = subscriptionId;
        }


        // Cleanup on unmount or routeIds change
        return () => {
            for (const subscriptionId of Object.values(subscriptionIdsRef.current)) {
                subscriptionManager.unsubscribeCompletely(subscriptionId);
            }
            subscriptionIdsRef.current = {};
            Object.values(markersRef.current).forEach(marker => marker.map = null);
            markersRef.current = {};
            routeToVehicleMap.current = {};
        };


    }, [routeIds, map, busClicked, updateSelectionData, routes]);


    // Watch for global staleness (if all markers are stale/removed, trigger resubscribe)
    useEffect(() => {
        // Reset last update on mount
        lastUpdateRef.current = Date.now();

        const checkStaleInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastUpdate = now - lastUpdateRef.current;

            // If we have active subscriptions (routes are selected)
            // AND we haven't received an update in > 45 seconds (half of STALE_THRESHOLD)
            // AND we are supposedly connected
            // THEN trigger a resync
            const hasSubscriptions = Object.keys(subscriptionIdsRef.current).length > 0;

            if (hasSubscriptions && timeSinceLastUpdate > 45000) {

                console.warn(`[BusMarkers] No updates received in ${Math.round(timeSinceLastUpdate / 1000)}s. Triggering resubscription check...`);

                subscriptionManager.resubscribeAll();
                lastUpdateRef.current = Date.now(); // Reset to prevent spamming
            }
        }, 10000);

        return () => clearInterval(checkStaleInterval);
    }, [routeIds]); // Re-run if route selection changes

    return null;
}

export default BusMarkers;