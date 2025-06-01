import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
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

const londonCoords = { lat: 42.9867, lng: -81.2486 };
const mapBounds = {
  north: 43.109,
  south: 42.8644,
  west: -81.6466,
  east: -80.8506,
};

const routeColors = {
  '02': 'blue',
  '07': 'red',
  '10': 'green',
  '20': 'orange',
  '34': 'purple',
};

const MapWithBuses = ({ routeIds }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const routeToVehicleMap = useRef({});
  const subscriptionsRef = useRef({});
  const client = useApolloClient();

  const initMap = async () => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
    });

    const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
      loader.importLibrary('maps'),
      loader.importLibrary('marker'),
    ]);

    const map = new Map(mapRef.current, {
      center: londonCoords,
      zoom: 12,
      disableDefaultUI: true,
      restriction: {
        latLngBounds: mapBounds,
        strictBounds: true,
      },
      mapId: import.meta.env.VITE_MAP_ID,
    });

    mapInstance.current = map;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userIcon = document.createElement('div');
          userIcon.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="green">
            <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5
              c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/>
          </svg>`;
          new AdvancedMarkerElement({
            position: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            },
            map,
            title: 'You are here',
            content: userIcon,
          });
        },
        (err) => console.error('Geolocation error:', err)
      );
    }
  };

  useEffect(() => {
    initMap();
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps) return;

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
              existingMarker.position = pos; // No flicker now
            }
          } else {
            const color = routeColors[routeId] || 'gray';
            const iconElement = document.createElement('div');
            /*
            iconElement.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="${color}">
              <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5
                c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/>
            </svg>`;
            */
            iconElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="${color}">
                <path d="M480-280q83 0 141.5-58.5T680-480q0-83-58.5-141.5T480-680q-83 0-141.5 58.5T280-480q0 83 58.5 141.5T480-280Zm0 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z"/>
            </svg>`;

            markersRef.current[id] = new AdvancedMarkerElement({
              position: pos,
              map: mapInstance.current,
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
  }, [routeIds]);

  return <div ref={mapRef} className="w-full h-full" />;
};

export default MapWithBuses;
