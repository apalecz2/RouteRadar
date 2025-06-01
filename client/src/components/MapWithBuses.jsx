// MapWithBuses.jsx
import { useEffect, useRef, useState } from 'react';
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

const londonCoords = {
  lat: 42.9867,
  lng: -81.2486,
};

const mapBounds = {
  north: 43.109,
  south: 42.8644,
  west: -81.6466,
  east: -80.8506,
};

const MapWithBuses = ({ routeId }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const [advancedMarkerLib, setAdvancedMarkerLib] = useState(null);
  const client = useApolloClient();

  // Initialize map once
  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
    });

    const initMap = async () => {
      const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
        loader.importLibrary('maps'),
        loader.importLibrary('marker'),
      ]);

      setAdvancedMarkerLib(() => AdvancedMarkerElement);

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

      // Show user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userIcon = document.createElement('div');
            userIcon.innerHTML = `
              <svg width="32" height="32" viewBox="0 0 24 24" fill="green">
                <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5
                  c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/>
              </svg>
            `;
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

    initMap();
  }, []);

  // Subscription logic — run when map is ready
  useEffect(() => {
    if (!routeId || !mapInstance.current || !advancedMarkerLib) return;

    const observable = client.subscribe({
      query: VEHICLE_SUBSCRIPTION,
      variables: { routeId: String(routeId).padStart(2, '0') },
    });

    const subscription = observable.subscribe({
      next({ data }) {
        const vehicle = data?.vehicleUpdates;
        if (!vehicle) return;

        const id = vehicle.VehicleId;
        const position = { lat: vehicle.Latitude, lng: vehicle.Longitude };

        const iconElement = document.createElement('div');
        iconElement.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="blue">
            <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5
              c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/>
          </svg>
        `;

        if (markersRef.current[id]) {
          markersRef.current[id].position = position;
        } else {
          markersRef.current[id] = new advancedMarkerLib({
            position,
            map: mapInstance.current,
            title: vehicle.Destination,
            content: iconElement,
          });
        }
      },
      error(err) {
        console.error('Subscription error:', err);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [routeId, mapInstance.current, advancedMarkerLib]);

  return <div className="w-full h-[600px]" ref={mapRef} />;
};

export default MapWithBuses;
