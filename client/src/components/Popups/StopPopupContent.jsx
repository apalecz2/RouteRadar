import { useState, useEffect } from 'react';
import { getRouteColor } from '../../utils/getRouteColor';

function formatTime(unixSeconds) {
    const date = new Date(unixSeconds * 1000);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', });
}

function formatDelay(delaySeconds) {
    if (!delaySeconds) return null;
    const min = Math.floor(Math.abs(delaySeconds) / 60);
    const sec = Math.abs(delaySeconds) % 60;
    const sign = delaySeconds > 0 ? '+' : '-';
    return `${sign}${min ? min + 'm ' : ''}${sec}s`;
}

function formatTimeAgo(secondsAgo) {
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    return `${Math.floor(secondsAgo / 3600)}h ago`;
}

function formatStopName(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const StopPopupContent = ({ stop, arrivals = [] }) => {
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));
    const [lastUpdateTime, setLastUpdateTime] = useState(null);
    const [collapsedRoutes, setCollapsedRoutes] = useState({});

    const toggleRoute = (routeId) => {
        setCollapsedRoutes(prev => ({
            ...prev,
            [routeId]: !prev[routeId]
        }));
    };

    useEffect(() => {
        const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (arrivals && arrivals.length > 0) {
            setLastUpdateTime(Math.max(...arrivals.map(a => a.timestamp)));
        }
    }, [arrivals]);

    if (!stop) return null;

    // Group arrivals by route, take next 3 per route
    const grouped = {};
    for (const a of arrivals) {
        if (!grouped[a.routeId]) grouped[a.routeId] = [];
        grouped[a.routeId].push(a);
    }
    Object.keys(grouped).forEach(routeId => {
        grouped[routeId] = grouped[routeId]
            .sort((a, b) => a.arrivalTime - b.arrivalTime)
            .slice(0, 3);
    });

    // Sort routes numerically
    const sortedRoutes = Object.entries(grouped).sort(([a], [b]) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-4 pb-20 md:pb-0"> 
            
            {/* Header Section */}
            <div className="bg-white sticky -top-6 z-20 pt-6 pb-4 border-b border-gray-100 shadow-sm -mx-6 px-6 mb-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                            {formatStopName(stop.name)}
                        </h2>
                        {lastUpdateTime && (
                            <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">update</span>
                                <span>Updated: {new Date(lastUpdateTime * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
                                <span className="text-gray-500">({formatTimeAgo(now - lastUpdateTime)})</span>
                            </div>
                        )}
                    </div>
                     <span className="material-symbols-outlined text-gray-500">pin_drop</span>
                </div>
                
                {/* Routes Badges */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {stop.routes?.map((route, i) => (
                        <div 
                            key={i} 
                            className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold border border-gray-200 shadow-sm flex items-center"
                        >
                            {route}
                        </div>
                    ))}
                </div>
            </div>

            {/* Arrivals List */}
            <div className="space-y-6 pt-2">
                {sortedRoutes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                        <span className="material-symbols-outlined text-gray-400 text-4xl mb-2">schedule</span>
                        <h3 className="text-gray-900 font-semibold mb-1">No upcoming arrivals</h3>
                        <p className="text-sm text-gray-600 max-w-[200px]">
                            This stop may not have active buses right now, or the data is unavailable.
                        </p>
                    </div>
                ) : (
                    <>
                        {sortedRoutes.map(([routeId, arrs], idx) => {
                            const isCollapsed = collapsedRoutes[routeId];
                            
                            return (
                                <div key={routeId} className="space-y-1">
                                    {/* Route Header */}
                                    <div 
                                        onClick={() => toggleRoute(routeId)}
                                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors group select-none"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 rounded-full" style={{ background: getRouteColor(idx) }} />
                                            <h3 className="text-lg font-bold text-gray-800">
                                                Route {routeId}
                                            </h3>
                                        </div>
                                        <span className={`material-symbols-outlined text-gray-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>
                                            expand_more
                                        </span>
                                    </div>

                                    {/* Arrival Cards */}
                                    <div className={`grid gap-2 pl-3 transition-all duration-300 ease-in-out origin-top ${isCollapsed ? 'grid-rows-[0fr] opacity-0 scale-y-95 pointer-events-none overflow-hidden' : 'grid-rows-[1fr] opacity-100 scale-y-100'}`}>
                                        <div className="min-h-0 space-y-2">
                                            {arrs.map((a, i) => {
                                                const secondsToArrival = a.arrivalTime - now;
                                                const showCountdown = secondsToArrival > 0 && secondsToArrival <= 600; // 10 min
                                                const isDelay = a.delaySeconds > 0;
                                                const isEarly = a.delaySeconds < 0;

                                                return (
                                                    <div 
                                                        key={a.tripId + '-' + i} 
                                                        className="bg-white border border-gray-100 shadow-sm rounded-lg p-3 group relative overflow-hidden"
                                                    >
                                                        {/* Status Color Bar */}
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDelay ? 'bg-red-400' : isEarly ? 'bg-green-400' : 'bg-gray-200'}`} />

                                                        <div className="pl-2">
                                                            <div className="flex justify-between items-start mb-1">
                                                                {/* Time Display */}
                                                                <div>
                                                                    {showCountdown ? (
                                                                        <span className={`text-2xl font-bold tracking-tight ${secondsToArrival < 60 ? 'text-green-600' : 'text-gray-900'}`}>
                                                                            {secondsToArrival < 60 
                                                                                ? `${secondsToArrival}s` 
                                                                                : `${Math.floor(secondsToArrival / 60)}m ${secondsToArrival % 60}s`
                                                                            }
                                                                        </span>
                                                                    ) : (
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className="text-xl font-bold text-gray-900">
                                                                                {formatTime(a.arrivalTime)}
                                                                            </span>
                                                                            {secondsToArrival > 0 && (
                                                                                <span className="text-sm font-medium text-gray-600">
                                                                                    ({Math.floor(secondsToArrival / 60)}m)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Delay Pill */}
                                                                {a.delaySeconds !== 0 && (
                                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-2 ${
                                                                        isDelay ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                                                    }`}>
                                                                        {isDelay ? 'Late' : 'Early'} {formatDelay(a.delaySeconds)}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                                                <span>Scheduled: {formatTime(a.arrivalTime - a.delaySeconds)}</span>
                                                                {a.tripId && <span className="font-mono text-[10px] opacity-60">#{a.tripId.slice(-4)}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        <div className="text-center py-6 text-xs font-medium text-gray-500 border-t border-gray-100 mt-4 border-dashed">
                            <span>End of current arrival estimates</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StopPopupContent;