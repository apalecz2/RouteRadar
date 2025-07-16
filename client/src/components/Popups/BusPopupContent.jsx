import { useEffect, useState } from 'react';
import { getCachedData } from '../../utils/dataCache';
import { getRouteColor } from '../../utils/getRouteColor';

const formatTimeAgo = (secondsAgo) => {
    if (secondsAgo == 1) return `${secondsAgo} second ago`;
    if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
    if (secondsAgo < 120) return `1 minute ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} minute(s) ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} hour(s) ago`;
    return `${Math.floor(secondsAgo / 86400)} day(s) ago`;
};

const BusPopupContent = ({ bus }) => {
    const [secondsAgo, setSecondsAgo] = useState(() => Math.floor(Date.now() / 1000) - bus.timestamp);
    const [stopName, setStopName] = useState(bus.Destination);

    useEffect(() => {
        setSecondsAgo(Math.floor(Date.now() / 1000) - bus.timestamp);
        const interval = setInterval(() => {
            setSecondsAgo(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [bus.timestamp]);

    useEffect(() => {
        let isMounted = true;
        async function fetchStopName() {
            if (!bus.Destination || bus.Destination === 'na') {
                setStopName(bus.Destination);
                return;
            }
            const { stops } = await getCachedData();
            const found = stops.find(s => s.stop_id === bus.Destination);
            if (isMounted) {
                setStopName(found ? found.name : bus.Destination);
            }
        }
        fetchStopName();
        return () => { isMounted = false; };
    }, [bus.Destination]);

    const time = new Date(bus.timestamp * 1000).toLocaleString();
    const timeAgo = formatTimeAgo(secondsAgo);

    // Extract route number and postfix, remove zero padding
    let routeDisplay = bus.RouteId ? bus.RouteId.replace(/^0+/, '') : '';

    // Compute route color for badge
    const [routeColor, setRouteColor] = useState('#2563eb'); // fallback blue

    useEffect(() => {
        let isMounted = true;
        async function fetchColor() {
            if (!bus.RouteId) return;
            const { routes } = await getCachedData();
            if (!routes || !Array.isArray(routes)) return;
            // Find index of this route in the routes array (by id, ignoring zero padding)
            const idx = routes.findIndex(r => (r.route_id || r.id || '').replace(/^0+/, '') === routeDisplay);
            const color = idx >= 0 ? getRouteColor(idx, routes.length) : '#2563eb';
            if (isMounted) setRouteColor(color);
        }
        fetchColor();
        return () => { isMounted = false; };
    }, [bus.RouteId, routeDisplay]);

    // Only show time (not date), hour not zero padded
    const timeOnly = new Date(bus.timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

    // Consider data stale if more than 60 seconds old
    const isStale = secondsAgo > 60;

    return (
        <div className="p-2 min-w-[220px] max-w-[80%]">
            
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-black tracking-wide text-left m-0 p-0">
                    Route {routeDisplay}
                </h2>
                {/* The close button is rendered by BottomPopup, so nothing here */}
            </div>
            {/* Route color bar */}
            <div style={{ background: routeColor, height: 6, borderRadius: 4, marginBottom: 10 }} />
            {/* Removed bus number/vehicle id badge */}
            <div className="mb-2">
                <span className="block text-gray-500 text-xs uppercase font-medium mb-1">Next Stop</span>
                <span className="text-base font-semibold text-gray-900">{stopName}</span>
            </div>
            {bus.occupancy_percentage !== undefined && bus.occupancy_percentage !== null && (
                <div className="mb-2">
                    <span className="block text-gray-500 text-xs uppercase font-medium mb-1">Occupancy</span>
                    <span className="text-base text-gray-900">{bus.occupancy_percentage}%</span>
                </div>
            )}
            <div className="mt-3 text-sm text-black font-medium text-left">
                Here at: {timeOnly} <span className="ml-2 text-gray-600">{timeAgo}</span>
            </div>
            {isStale && (
                <div className="mt-4 text-sm text-yellow-600 font-semibold text-left">
                    This bus information may be out of date. Check connection, and try again soon for the latest updates.
                </div>
            )}
        </div>
    );
};

export default BusPopupContent;
