// This component subscribes to routes based the passed selection for bus locations
// it creates the markers for these buses and passed the click handler to the parent to assign highlight and popups from there


import { useEffect, useRef, useState } from 'react';
import { gql, useApolloClient } from '@apollo/client';

const VEHICLE_SUBSCRIPTION = gql`
    subscription VehicleUpdates($routeId: String!) {
        vehicleUpdates(routeId: $routeId) {
            RouteId
            Latitude
            Longitude
            Destination
            VehicleId
            Bearing
            timestamp
        }
    }
`;


// Export to allow calls from parent to set and reset highlight when it's selected or deselected
export function createBusPin(color = 'gray', rotation = 0, withPing = false) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '24px';
    wrapper.style.height = '24px';
    wrapper.style.transform = 'translateY(50%)';

    if (withPing) {
        const ping = document.createElement('div');
        ping.className = 'bus-ping';
        wrapper.appendChild(ping);
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("height", "24px");
    svg.setAttribute("viewBox", "0 -960 960 960");
    svg.setAttribute("width", "24px");
    svg.setAttribute("fill", color);
    svg.style.transform = `rotate(${rotation}deg)`; // <-- Preserve rotation
    svg.style.transition = 'transform 0.3s ease';

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "m480-226.13-260.63 111.2q-14.67 5.71-27.85 2.73-13.17-2.97-22.37-12.17-9.19-9.19-12.05-22.75-2.86-13.55 3.1-28.23l277.78-625.76q5.72-13.67 17.65-20.51 11.94-6.84 24.37-6.84 12.43 0 24.37 6.84 11.93 6.84 17.65 20.51L799.8-175.35q5.96 14.68 3.1 28.23-2.86 13.56-12.05 22.75-9.2 9.2-22.37 12.17-13.18 2.98-27.85-2.73L480-226.13Z");
    svg.appendChild(path);

    wrapper.appendChild(svg);

    return wrapper;
}


const BusMarkers2 = ({ routeIds, map, busClicked, registerPinCreator, updateSelectionData }) => {

    const client = useApolloClient();

    const markersRef = useRef({});
    const routeToVehicleMap = useRef({});
    const subscriptionsRef = useRef({});

    // Tell the parent where to call to make pin
    useEffect(() => {
        registerPinCreator?.('bus', createBusPin);
    }, [registerPinCreator]);

    useEffect(() => {

        // Validate map reference
        if (!map || !window.google?.maps) return;
        const AdvancedMarkerElement = window.google.maps.marker?.AdvancedMarkerElement;
        if (!AdvancedMarkerElement) return;

        const newRoutes = new Set(routeIds);
        const currentRoutes = new Set(Object.keys(subscriptionsRef.current));

        const routesToRemove = [...currentRoutes].filter(r => !newRoutes.has(r));
        const routesToAdd = [...newRoutes].filter(r => !currentRoutes.has(r));

        // Unsubscribe and remove old routes
        for (const route of routesToRemove) {
            subscriptionsRef.current[route]?.unsubscribe();
            delete subscriptionsRef.current[route];

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

            const observable = client.subscribe({
                query: VEHICLE_SUBSCRIPTION,
                variables: { routeId },
            });

            const sub = observable.subscribe({
                next({ data }) {
                    const vehicle = data?.vehicleUpdates;
                    if (!vehicle) return;

                    const id = vehicle.VehicleId;
                    const pos = { lat: vehicle.Latitude, lng: vehicle.Longitude };
                    const rotation = vehicle.Bearing || 0;
                    const color = 'gray';

                    routeToVehicleMap.current[routeId].add(id);

                    const existingMarker = markersRef.current[id];
                    if (existingMarker) {
                        // Update position
                        existingMarker.position = pos;
                        existingMarker.vehicleData = vehicle;

                        // Update bearing/rotation
                        const svgElement = existingMarker.content.querySelector('svg');
                        if (svgElement) {
                            svgElement.style.transform = `rotate(${rotation}deg)`;
                        }

                        // Update selection data if this bus is currently selected
                        updateSelectionData?.(id, vehicle);
                    } else {
                        // Create new marker
                        const content = createBusPin(color, rotation, false);
                        const marker = new AdvancedMarkerElement({
                            position: pos,
                            map,
                            title: vehicle.Destination,
                            content,
                        });

                        marker.vehicleData = vehicle;

                        marker.addListener('click', () => {
                            busClicked(marker.vehicleData, 'bus', marker);
                        });

                        markersRef.current[id] = marker;
                    }
                },
            });

            subscriptionsRef.current[routeId] = sub;
        }


        // Cleanup on unmount or routeIds change
        return () => {
            for (const sub of Object.values(subscriptionsRef.current)) {
                sub.unsubscribe();
            }
            subscriptionsRef.current = {};
            Object.values(markersRef.current).forEach(marker => marker.map = null);
            markersRef.current = {};
            routeToVehicleMap.current = {};
        };


    }, [routeIds, map, busClicked, updateSelectionData]);


    return null;
}

export default BusMarkers2;