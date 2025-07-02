import { useState, useEffect, useRef } from 'react';
import DirectionsSearch from './DirectionsSearch';
import { Loader } from '@googlemaps/js-api-loader';

const TransitDirections = ({ map }) => {
    const [mapsApiLoaded, setMapsApiLoaded] = useState(false);
    const [directions, setDirections] = useState(null);
    const polylineRef = useRef(null);

    // Load Google Maps API libraries if not already loaded
    useEffect(() => {
        const loader = new Loader({
            apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            version: 'weekly',
            libraries: ['places', 'geometry'],
        });
        loader.load().then(() => setMapsApiLoaded(true));
    }, []);

    // Handle search and fetch directions
    const handleDirectionsSearch = async ({ origin, destination }) => {
        if (!origin || !destination) return;
        const originLoc = origin.geometry?.location;
        const destLoc = destination.geometry?.location;
        let originLatLng, destLatLng;
        if (originLoc && typeof originLoc.lat === 'function') {
            originLatLng = { lat: originLoc.lat(), lng: originLoc.lng() };
        } else if (origin.geometry?.location?.lat && origin.geometry?.location?.lng) {
            originLatLng = { lat: origin.geometry.location.lat, lng: origin.geometry.location.lng };
        } else {
            originLatLng = origin.formatted_address || origin.name;
        }
        if (destLoc && typeof destLoc.lat === 'function') {
            destLatLng = { lat: destLoc.lat(), lng: destLoc.lng() };
        } else if (destination.geometry?.location?.lat && destination.geometry?.location?.lng) {
            destLatLng = { lat: destination.geometry.location.lat, lng: destination.geometry.location.lng };
        } else {
            destLatLng = destination.formatted_address || destination.name;
        }
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: originLatLng,
                destination: destLatLng,
                travelMode: window.google.maps.TravelMode.TRANSIT,
            },
            (result, status) => {
                if (status === 'OK' && result.routes && result.routes.length > 0) {
                    setDirections(result.routes[0]);
                    // Log the full route object
                    console.log('Full directions route:', result.routes[0]);
                    // Log all legs and steps
                    result.routes[0].legs.forEach((leg, i) => {
                        console.log(`Leg ${i + 1}:`, leg);
                        leg.steps.forEach((step, j) => {
                            console.log(`  Step ${j + 1}:`, step);
                            if (step.transit) {
                                console.log('    Transit details:', step.transit);
                            }
                        });
                    });
                } else {
                    setDirections(null);
                    alert('No transit directions found.');
                }
            }
        );
    };

    // Draw or clear directions polyline
    useEffect(() => {
        if (!map) return;
        // Remove previous polyline
        if (polylineRef.current) {
            polylineRef.current.setMap(null);
            polylineRef.current = null;
        }
        if (directions && directions.overview_path) {
            const path = directions.overview_path;
            const polyline = new window.google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: '#4285F4',
                strokeOpacity: 0.8,
                strokeWeight: 6,
                map: map,
                zIndex: 10,
            });
            polylineRef.current = polyline;
            // Optionally fit bounds
            const bounds = new window.google.maps.LatLngBounds();
            path.forEach((latLng) => bounds.extend(latLng));
            map.fitBounds(bounds);
        }
        // Cleanup on unmount
        return () => {
            if (polylineRef.current) {
                polylineRef.current.setMap(null);
                polylineRef.current = null;
            }
        };
    }, [directions, map]);

    return (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
            <DirectionsSearch onSearch={handleDirectionsSearch} mapsApiLoaded={mapsApiLoaded} />
        </div>
    );
};

export default TransitDirections; 