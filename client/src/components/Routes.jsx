import { useEffect, useRef, useState } from 'react';

const Routes = ({ map, routeIds }) => {
  const polylinesRef = useRef([]);
  const [routeData, setRouteData] = useState([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await fetch('/routes.json');
        const data = await response.json();
        setRouteData(data);
      } catch (err) {
        console.error('Failed to load route geometry data:', err);
      }
    };

    fetchRoutes();
  }, []);

  useEffect(() => {
    if (!map || routeData.length === 0) return;

    // Clear old lines
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    routeData.forEach((route, idx) => {
      if (routeIds.length > 0 && !routeIds.includes(route.id)) return;

      const color = getColorForIndex(idx);

      route.segments.forEach(segment => {
        const path = segment.map(([lat, lng]) => ({ lat, lng }));

        const polyline = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map,
        });

        polylinesRef.current.push(polyline);
      });
    });

    return () => {
      polylinesRef.current.forEach(polyline => polyline.setMap(null));
    };
  }, [map, routeData, routeIds]);

  return null;
};

function getColorForIndex(index) {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#F39C12', '#9B59B6',
    '#16A085', '#E74C3C', '#3498DB', '#2ECC71', '#E67E22',
  ];
  return colors[index % colors.length];
}

export default Routes;
