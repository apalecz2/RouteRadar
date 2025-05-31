import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const Map = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: "weekly",
    });

    loader
      .importLibrary("maps")
      .then(({ Map }) => {
        new Map(mapRef.current, {
          center: { lat: 43.6532, lng: -79.3832 },
          zoom: 12,
        });
      })
      .catch(e => {
        console.error("Google Maps API load error:", e);
      });
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-[500px] rounded-lg shadow-lg"
    />
  );
};

export default Map;
