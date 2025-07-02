import { useEffect, useRef } from 'react';
import { useData } from './DataProvider';

const Routes = ({ map, routeIds }) => {
    const polylinesRef = useRef([]);
    const { routes, loading, error } = useData();

    useEffect(() => {
        if (loading || error) return;
        // No need to set state, just use routes directly
    }, [loading, error]);

    useEffect(() => {
        if (!map || loading || error || !routes || routes.length === 0) return;

        // Clear old lines
        polylinesRef.current.forEach(polyline => polyline.setMap(null));
        polylinesRef.current = [];

        routes.forEach((route, idx) => {
            if (routeIds.length > 0 && !routeIds.includes(route.id)) return;

            const color = getRouteColor(idx, 37);

            route.segments.forEach(segment => {
                const path = segment.map(([lat, lng]) => ({ lat, lng }));

                const outline = new window.google.maps.Polyline({
                    path,
                    geodesic: true,
                    strokeColor: '#000000',
                    strokeOpacity: 0.6,
                    strokeWeight: 6,
                    map,
                    zIndex: 1,
                });
                polylinesRef.current.push(outline);

                const polyline = new window.google.maps.Polyline({
                    path,
                    geodesic: true,
                    strokeColor: color,
                    strokeOpacity: 0.7,
                    strokeWeight: 4,
                    map,
                    zIndex: 2,
                });
                polylinesRef.current.push(polyline);
            });
        });

        return () => {
            polylinesRef.current.forEach(polyline => polyline.setMap(null));
        };
    }, [map, routes, routeIds, loading, error]);

    return null;
};

function getRouteColor(index, totalRoutes) {
    const hue = (index * 360 / totalRoutes) % 360;
    const saturation = 70;
    const lightness = 50;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default Routes;
