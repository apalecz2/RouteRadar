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
        }
    }
`;

const routeColors = {
    '02': 'blue',
    '07': 'red',
    '10': 'green',
    '20': 'orange',
    '34': 'purple',
};

const BusMarkers = ({ routeIds, map, showPopup }) => {
    const client = useApolloClient();
    const markersRef = useRef({});
    const routeToVehicleMap = useRef({});
    const subscriptionsRef = useRef({});
    
    const [selectedBus, setSelectedBus] = useState(null);


    useEffect(() => {
        if (!map || !window.google?.maps) return;

        const AdvancedMarkerElement = window.google.maps.marker?.AdvancedMarkerElement;
        if (!AdvancedMarkerElement) return;

        const newRoutes = new Set(routeIds);
        const currentRoutes = new Set(Object.keys(subscriptionsRef.current));

        const routesToRemove = [...currentRoutes].filter(r => !newRoutes.has(r));
        const routesToAdd = [...newRoutes].filter(r => !currentRoutes.has(r));

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


                    routeToVehicleMap.current[routeId].add(id);

                    const existingMarker = markersRef.current[id];
                    if (existingMarker) {
                        const markerContent = existingMarker.content?.firstChild;
                        if (markerContent?.style) {
                            markerContent.style.transform = `rotate(${vehicle.Bearing || 0}deg)`;
                        }
                        existingMarker.position = pos;

                    } else {
                        const color = routeColors[routeId] || 'gray';
                        const iconElement = document.createElement('div');
                        const rotation = vehicle.Bearing || 0;
                        iconElement.innerHTML = `
                        
                            <svg xmlns="http://www.w3.org/2000/svg" 
                                height="24px" viewBox="0 -960 960 960" width="24px" fill="${color}"
                                style="transform: rotate(${rotation}deg); transition: transform 0.3s ease;"
                            >
                                <path d="m480-226.13-260.63 111.2q-14.67 5.71-27.85 2.73-13.17-2.97-22.37-12.17-9.19-9.19-12.05-22.75-2.86-13.55 3.1-28.23l277.78-625.76q5.72-13.67 17.65-20.51 11.94-6.84 24.37-6.84 12.43 0 24.37 6.84 11.93 6.84 17.65 20.51L799.8-175.35q5.96 14.68 3.1 28.23-2.86 13.56-12.05 22.75-9.2 9.2-22.37 12.17-13.18 2.98-27.85-2.73L480-226.13Z"/>
                            </svg>
                         
                        `;
                        iconElement.style.transform = 'translateY(50%)'   // Centers marker vertically
                        markersRef.current[id] = new AdvancedMarkerElement({
                            position: pos,
                            map,
                            title: vehicle.Destination,
                            content: iconElement,
                        })

                        markersRef.current[id].addListener('click', () => {
                            
                            showPopup({ type: 'bus', data: vehicle })
                            
                        });
                    }
                },
            });

            subscriptionsRef.current[routeId] = sub;
        }

        return () => {
            for (const sub of Object.values(subscriptionsRef.current)) {
                sub.unsubscribe();
            }
            subscriptionsRef.current = {};
            Object.values(markersRef.current).forEach(marker => marker.map = null);
            markersRef.current = {};
            routeToVehicleMap.current = {};
        };
    }, [routeIds, map]);
    
    return null
};

export default BusMarkers;
