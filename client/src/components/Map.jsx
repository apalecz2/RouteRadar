import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const Map = () => {
    const mapRef = useRef(null);

    const londonCoords = {
        lat: 42.9867,
        lng: -81.2486
    }
    const mapBounds = {
        north: 43.1090,
        south: 42.8644,
        west: -81.6466, // +-0.398
        east: -80.8506
    }
    
    // Test locations
    const locations = [
        { lat: 42.9867, lng: -81.2476, title: "Toronto" },
        { lat: 42.9867, lng: -81.2486, title: "Ottawa" },
        { lat: 42.9867, lng: -81.2496, title: "Vancouver" },
    ];
    
    // Custom icon
    const iconElement = document.createElement("div");
    iconElement.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="green">
            <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5
                c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/>
        </svg>
    `;

    useEffect(() => {
        const loader = new Loader({
            apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            version: "weekly",
        });

        const initMap = async () => {
            const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
                loader.importLibrary("maps"),
                loader.importLibrary("marker"),
            ]);

            const map = new Map(mapRef.current, {
                center: { lat: londonCoords.lat, lng: londonCoords.lng },
                zoom: 12,
                disableDefaultUI: true,
                restriction: {
                    latLngBounds: mapBounds,
                    strictBounds: true,
                },
                mapId: import.meta.env.VITE_MAP_ID,
            });

            locations.forEach((loc) => {
                const iconClone = iconElement.cloneNode(true);
                new AdvancedMarkerElement({
                    position: { lat: loc.lat, lng: loc.lng },
                    map,
                    title: loc.title,
                    content: iconClone,
                });
            });

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {

                        const userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };

                        const iconClone = iconElement.cloneNode(true);
                        new AdvancedMarkerElement({
                            position: userLocation,
                            map,
                            title: "You are here",
                            content: iconClone,
                        });
                    },
                    (error) => {
                        console.error("Geolocation error:", error);
                    }
                )
            }

        };

        initMap();
    }, []);

    return (
        <div
            ref={mapRef}
            className="w-full h-screen"
        />
    );
};

export default Map;
