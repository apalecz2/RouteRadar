import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const londonCoords = { lat: 42.9867, lng: -81.2486 };
const mapBounds = {
    north: 43.109,
    south: 42.8644,
    west: -81.6466,
    east: -80.8506,
};

const MapContainer = ({ onMapLoad }) => {
    const mapRef = useRef(null);

    useEffect(() => {
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
            
            
            // Stop other things on the map from being able to be clicked
            map.addListener("click", function(event) {
                if (event.placeId) {
                    // Suppress the default behavior
                    event.stop();
                }
            });

            onMapLoad(map); // Pass map instance to parent

            // Optional: Show user's current location
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

        initMap();
    }, [onMapLoad]);

    return <div ref={mapRef} className="w-full h-full" />;
};

export default MapContainer;
