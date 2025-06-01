import { useEffect, useRef } from 'react';
import { gql, useApolloClient } from '@apollo/client';

const VEHICLE_SUBSCRIPTION = gql`
  subscription VehicleUpdates($routeId: String!) {
    vehicleUpdates(routeId: $routeId) {
      RouteId
      Latitude
      Longitude
      Destination
      VehicleId
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

const BusMarkers = ({ routeIds, map }) => {
  const client = useApolloClient();
  const markersRef = useRef({});
  const routeToVehicleMap = useRef({});
  const subscriptionsRef = useRef({});

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
            const oldLat = existingMarker.position.lat;
            const oldLng = existingMarker.position.lng;
            const hasMoved = Math.abs(oldLat - pos.lat) > 0.0001 || Math.abs(oldLng - pos.lng) > 0.0001;
            if (hasMoved) {
              existingMarker.position = pos;
            }
          } else {
            const color = routeColors[routeId] || 'gray';
            const iconElement = document.createElement('div');
            iconElement.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="${color}">
                  <path d="M480-280q83 0 141.5-58.5T680-480q0-83-58.5-141.5T480-680q-83 0-141.5 58.5T280-480q0 83 58.5 141.5T480-280Zm0 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z"/>
              </svg>`;

            markersRef.current[id] = new AdvancedMarkerElement({
              position: pos,
              map,
              title: vehicle.Destination,
              content: iconElement,
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

  return null;
};

export default BusMarkers;
