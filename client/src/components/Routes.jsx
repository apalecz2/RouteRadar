import { useEffect, useRef } from 'react';

const Routes = ({ map, geometryData, routeIds }) => {
  const polylinesRef = useRef([]);

  useEffect(() => {
    if (!map || !geometryData || geometryData.type !== 'GeometryCollection') return;

    // Clear old lines
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    geometryData.geometries.forEach((geometry, idx) => {
      if (geometry.type !== 'MultiLineString') return;

      geometry.coordinates.forEach((lineCoords, i) => {
        const path = lineCoords.map(([lng, lat]) => ({ lat, lng }));

        const polyline = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: getColorForIndex(idx),
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map,
        });

        polylinesRef.current.push(polyline);
      });
    });

    return () => {
      // Clean up
      polylinesRef.current.forEach(polyline => polyline.setMap(null));
    };
  }, [map, geometryData, routeIds]);

  return null;
};

// You could improve this to use routeIds -> colors if needed
function getColorForIndex(index) {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#F39C12', '#9B59B6', '#16A085',
    '#E74C3C', '#3498DB', '#2ECC71', '#E67E22',
  ];
  return colors[index % colors.length];
}

export default Routes;
