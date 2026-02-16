import { useState, useEffect, useRef } from 'react';

function formatTime(unixSeconds) {
    const date = new Date(unixSeconds * 1000);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', });
}

function formatRelativeTime(unixSeconds) {
    const now = Math.floor(Date.now() / 1000);
    const diff = unixSeconds - now;
    
    if (diff < 0) {
        return 'Past due';
    } else if (diff < 60) {
        return `${diff}s`;
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes}m`;
    } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
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

import { getRouteColor } from '../../utils/getRouteColor';

const StopPopupContent = ({ stop, arrivals = [] }) => {
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));
    const [lastUpdateTime, setLastUpdateTime] = useState(null);
    const [showScrollIndicator, setShowScrollIndicator] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(false);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (arrivals && arrivals.length > 0) {
            setLastUpdateTime(Math.max(...arrivals.map(a => a.timestamp)));
        }
    }, [arrivals]);

    const handleScroll = () => {
        const element = scrollContainerRef.current;
        if (!element) return;

        const { scrollTop, scrollHeight, clientHeight } = element;
        const isAtBottomNow = scrollTop + clientHeight >= scrollHeight - 5; // 5px threshold
        const hasMoreContent = scrollHeight > clientHeight;
        
        setIsAtBottom(isAtBottomNow);
        setShowScrollIndicator(hasMoreContent && !isAtBottomNow);
    };

    const handleScrollToBottom = () => {
        const element = scrollContainerRef.current;
        if (element) {
            element.scrollTo({
                top: element.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const element = scrollContainerRef.current;
        if (element) {
            // Check initial state after DOM paint
            setTimeout(() => handleScroll(), 0);
            
            // Add scroll event listener
            element.addEventListener('scroll', handleScroll);
            
            // Cleanup
            return () => element.removeEventListener('scroll', handleScroll);
        }
    }, [arrivals]); // Re-run when arrivals change

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

    // For color bar, use first route in stop.routes if available
    let mainRoute = stop.routes && stop.routes.length > 0 ? stop.routes[0] : null;
    let routeColor = mainRoute ? getRouteColor(0) : '#2563eb'; // fallback blue

    // If you want to color by route index, you could fetch all routes and find index

    // Data freshness
    const secondsAgo = lastUpdateTime ? now - lastUpdateTime : null;
    const updatedText = secondsAgo !== null ? `Updated: ${formatTimeAgo(secondsAgo)}` : '';

    return (
        <div className="p-1 md:p-2 min-w-[180px] max-w-[98vw] md:max-w-[100%] flex flex-col">
            {/* Header - always visible */}
            <div className="flex-shrink-0 max-w-[80%] md:max-w-[80%]">
                <div className="flex items-center justify-between mb-1 md:mb-2">
                    <h2 className="text-sm md:text-2xl font-bold text-black tracking-wide text-left m-0 p-0 truncate">
                        {stop.name}
                    </h2>
                </div>
                {/* Route color bar */}
                <div style={{ background: routeColor, height: 4, borderRadius: 4, marginBottom: 6 }} className="md:h-[6px] md:mb-[10px]" />
                <div className="mb-1 md:mb-2">
                    <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-gray-500 text-xs md:text-sm uppercase font-semibold">Routes:</span>
                        <span className="text-xs md:text-sm font-semibold text-gray-900 truncate">{stop.routes?.join(', ')}</span>
                    </div>
                </div>
            </div>

            {/* Scrollable arrivals section */}
            <div className="relative">
                <div 
                    ref={scrollContainerRef}
                    className="mt-2 md:mt-4 pr-1 md:pr-4 p-0 md:p-2 text-xs md:text-sm text-black overflow-y-scroll bg-white/30 rounded-sm"
                    style={{ maxHeight: 'calc(40vh - 120px)' }}
                >
                {Object.keys(grouped).length === 0 ? (
                    <div className="text-xs md:text-sm text-gray-400 mt-2 md:mt-4">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            No upcoming arrivals
                        </div>
                        <p className="text-xs">This stop may not have active buses or the data may be unavailable.</p>
                    </div>
                ) : (
                    <>
                        {Object.entries(grouped).map(([routeId, arrs], idx) => (
                            <div key={routeId} className="mb-2 md:mb-3">
                                <div className="flex items-center gap-1 md:gap-2 mb-1">
                                    <span className="w-2 h-2 rounded-full" style={{ background: getRouteColor(idx) }}></span>
                                    <span className="font-semibold text-xs md:text-sm">Route {routeId}</span>
                                </div>
                                <ul className="space-y-1">
                                    {arrs.map((a, i) => {
                                        const secondsToArrival = a.arrivalTime - now;
                                        const showCountdown = secondsToArrival > 0 && secondsToArrival <= 600; // 10 min
                                        return (
                                            <li key={a.tripId + '-' + i} className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-100 rounded px-1 md:px-2 py-1 pr-2 md:pr-4">
                                                <div className="grid grid-cols-3 w-full items-center min-w-0">
                                                    <span className="text-gray-700 font-medium max-w-[80px] md:max-w-[120px] text-xs md:text-sm">
                                                        {showCountdown
                                                            ? (
                                                                secondsToArrival < 60
                                                                    ? <><span className="block md:inline">In:</span> <span className="block md:inline">{secondsToArrival}s</span></>
                                                                    : <><span className="block md:inline">In:</span> <span className="block md:inline">{Math.floor(secondsToArrival / 60)}m {secondsToArrival % 60}s</span></>
                                                            )
                                                            : <><span className="block md:inline">At:</span> <span className="block md:inline">{formatTime(a.arrivalTime)}</span></>
                                                        }
                                                    </span>
                                                    <span className="text-xs text-gray-500">Scheduled: {formatTime(a.arrivalTime - a.delaySeconds)}</span>
                                                    {a.delaySeconds !== 0 && (
                                                        <span className={`text-xs font-semibold max-w-[60px] md:max-w-[120px] pl-1 md:pl-4 ${a.delaySeconds > 0 ? 'text-yellow-600' : 'text-green-700'}`}>{a.delaySeconds > 0 ? 'Delay' : 'Early'}: {formatDelay(a.delaySeconds)}</span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </>
                )}
                </div>
                {/* Scroll Indicator */}
                {showScrollIndicator && (
                    <div className="absolute bottom-1 md:bottom-2 left-0 right-0 flex items-center justify-center pointer-events-none" onClick={handleScrollToBottom}>
                        <div className="flex items-center justify-center h-8 w-8 md:h-12 md:w-12 rounded-2xl bg-white/75 dark:bg-white/75 backdrop-blur-2xl border border-black/30 dark:border-black/30 shadow-xl hover:bg-white/90 pointer-events-auto cursor-pointer">
                            <svg className="w-4 h-4 md:w-4 md:h-4 animate-bounce" fill="#000000" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer - always visible */}
            <div className="flex-shrink-0 mt-1 md:mt-2">
                {lastUpdateTime && (
                    <div className="text-xs md:text-sm text-black font-medium text-left">
                        Data Updated: {new Date(lastUpdateTime * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                        <span className="ml-2 text-gray-600">{formatTimeAgo(now - lastUpdateTime)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StopPopupContent;