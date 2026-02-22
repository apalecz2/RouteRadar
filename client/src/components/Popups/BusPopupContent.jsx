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
             <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-red-600">signal_wifi_off</span>
                    <h2 className="text-lg font-bold text-red-900">Signal Lost</h2>
                </div>
                 <p className="text-sm text-red-700">
                    Connection to this bus was lost. Try refreshing for the latest data.
                </p>
             </div>
        )
    }

    return (
        <div className="space-y-4">
            
            {/* Header Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-2 w-full" style={{ background: routeColor }} />
                <div className="p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Route</span>
                            <h2 className="text-3xl font-bold text-gray-900 leading-none mt-1">
                                {routeDisplay}
                            </h2>
                        </div>
                        {/* Status Badge */}
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${isStale ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {isStale ? 'Delayed Signal' : 'Live'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-gray-400 text-lg">location_on</span>
                        <span className="text-xs font-bold text-gray-500 uppercase">Next Stop</span>
                    </div>
                    <p className="text-base font-semibold text-gray-900 pl-7">{stopName}</p>
                </div>

                {bus.occupancy_percentage !== undefined && bus.occupancy_percentage !== null && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-gray-400 text-lg">group</span>
                            <span className="text-xs font-bold text-gray-500 uppercase">Occupancy</span>
                        </div>
                        <div className="pl-7">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-semibold text-gray-900">{bus.occupancy_percentage}%</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
                                    <div 
                                        className={`h-full rounded-full ${bus.occupancy_percentage > 80 ? 'bg-red-500' : bus.occupancy_percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                        style={{ width: `${bus.occupancy_percentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Timestamps */}
            <div className="text-xs text-gray-500 flex items-center justify-between px-1">
                <span>Updated: {timeOnly}</span>
                <span>{timeAgo}</span>
            </div>

            {isStale && (
                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start gap-3">
                     <span className="material-symbols-outlined text-yellow-600 text-lg mt-0.5">warning</span>
                    <p className="text-sm text-yellow-800">
                        This bus information may be out of date. Check connection, and try again soon.
                    </p>
                </div>
            )}
        </div>
    );
};

export default BusPopupContent;
