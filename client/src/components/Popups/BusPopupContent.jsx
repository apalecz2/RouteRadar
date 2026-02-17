import { useEffect, useState, useRef } from 'react';
import { getCachedData } from '../../utils/dataCache';
import { getRouteColor } from '../../utils/getRouteColor';
import subscriptionManager from '../../utils/subscriptionManager';
import { connectionStatus } from '../../utils/connectionStatus';

const formatTimeAgo = (secondsAgo) => {
    if (secondsAgo == 1) return `${secondsAgo}s ago`;
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    if (secondsAgo < 120) return `1 minute ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} minute(s) ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} hour(s) ago`;
    return `${Math.floor(secondsAgo / 86400)} day(s) ago`;
};

const BusPopupContent = ({ bus }) => {
    const [secondsAgo, setSecondsAgo] = useState(() => Math.floor(Date.now() / 1000) - bus.timestamp);
    const [stopName, setStopName] = useState(bus.Destination);

    useEffect(() => {
        // Update immediately
        setSecondsAgo(Math.floor(Date.now() / 1000) - bus.timestamp);
        
        const interval = setInterval(() => {
            // Recalculate based on current time rather than incrementing
            // This handles system sleep/wake correctly where intervals pause
            setSecondsAgo(Math.floor(Date.now() / 1000) - bus.timestamp);
        }, 1000);
        return () => clearInterval(interval);
    }, [bus.timestamp]);

    useEffect(() => {
        let isMounted = true;
        async function fetchStopName() {
            if (!bus.Destination || bus.Destination === 'na') {
                setStopName("Next stop not found. Please try again later.");
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
            const color = idx >= 0 ? getRouteColor(idx) : '#2563eb';
            if (isMounted) setRouteColor(color);
        }
        fetchColor();
        return () => { isMounted = false; };
    }, [bus.RouteId, routeDisplay]);

    // Only show time (not date), hour not zero padded
    const timeOnly = new Date(bus.timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

    // Consider data stale if more than 60 seconds old
    const isStale = secondsAgo > 60;
    
    // If data is stale but we think we are connected, force a resubscription
    // Use a ref to prevent spamming resubscriptions
    const hasAttemptedFix = useRef(false);

    useEffect(() => {
        if (isStale && !hasAttemptedFix.current && connectionStatus.get().connected) {
            console.warn('[BusPopup] Data stale despite active connection. Triggering resubscription...');
            hasAttemptedFix.current = true;
            subscriptionManager.resubscribeAll();
            
            // Reset the flag after 30 seconds to allow another attempt if it happens again
            setTimeout(() => {
                hasAttemptedFix.current = false;
            }, 30000);
        }
    }, [isStale]);
    
    // If extremely stale (> 90s), don't show the content at all, or show a specific "Lost Signal" message
    // The marker should have been removed from the map by now.
    const isVeryStale = secondsAgo > 90;

    if (isVeryStale) {
        return (
             <div className="p-2 min-w-[220px] max-w-[80%]">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-800 tracking-wide text-left m-0 p-0">
                        Signal Lost
                    </h2>
                </div>
                 <div className="mt-2 text-sm text-red-600 font-semibold text-left">
                    Connection to this bus was lost. Try refreshing for the latest data.
                </div>
             </div>
        )
    }

    return (
        <div className="p-2 min-w-[220px] max-w-[80%]">
            
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-black tracking-wide text-left m-0 p-0">
                    Route {routeDisplay}
                </h2>
            </div>
            <div style={{ background: routeColor, height: 6, borderRadius: 4, marginBottom: 10 }} />
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
                Here at: {timeOnly} <span className="ml-2 text-gray-600">({timeAgo})</span>
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
