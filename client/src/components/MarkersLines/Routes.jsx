import { useEffect, useRef } from 'react';
import { useData } from '../Providers/DataProvider';
import { getRouteColor } from '../../utils/getRouteColor';

const Routes = ({ map, routeIds, routeClicked, selectedRouteId }) => {
    const polylinesRef = useRef([]);
    const routeMainPolylinesRef = useRef({}); // Store only main polylines by route ID
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
        routeMainPolylinesRef.current = {};

        routes.forEach((route, idx) => {
            if (routeIds.length === 0) return;
            if (!routeIds.includes(route.id)) return;

            // Use highlight color if this route is selected
            const baseColor = getRouteColor(idx, 37);
            const color = selectedRouteId === route.id ? '#dd0000' : baseColor;
            const strokeWeight = selectedRouteId === route.id ? 6 : 4;
            const strokeOpacity = selectedRouteId === route.id ? 1.0 : 0.7;

            // Store main polylines for this route
            routeMainPolylinesRef.current[route.id] = [];

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
                    strokeOpacity: strokeOpacity,
                    strokeWeight: strokeWeight,
                    map,
                    zIndex: selectedRouteId === route.id ? 10 : 2, // Higher z-index for selected route
                });

                // Add click event listener to the polyline
                if (routeClicked) {
                    polyline.addListener('click', (event) => {
                        routeClicked(route, 'route', polyline, event);
                    });
                }

                polylinesRef.current.push(polyline);
                routeMainPolylinesRef.current[route.id].push(polyline); // Store only main polylines
            });
        });

        return () => {
            polylinesRef.current.forEach(polyline => polyline.setMap(null));
        };
    }, [map, routes, routeIds, loading, error, routeClicked, selectedRouteId]);

    // Effect to manage z-index when selection changes
    useEffect(() => {
        if (!map || !routes) return;

        // Reset all routes to normal z-index
        Object.keys(routeMainPolylinesRef.current).forEach(routeId => {
            const mainPolylines = routeMainPolylinesRef.current[routeId];
            if (mainPolylines) {
                mainPolylines.forEach((polyline) => {
                    if (polyline && typeof polyline.setZIndex === 'function') {
                        polyline.setZIndex(selectedRouteId === routeId ? 10 : 2);
                    }
                });
            }
        });
    }, [selectedRouteId, map, routes]);

    return null;
};

export default Routes;
