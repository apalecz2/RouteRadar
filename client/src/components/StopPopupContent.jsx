import { useState, useEffect } from 'react';

function formatTime(unixSeconds) {
    const date = new Date(unixSeconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', });
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

const StopPopupContent = ({ stop, arrivals = [] }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdateTime, setLastUpdateTime] = useState(null);

    // Track loading state and update times
    useEffect(() => {
        //console.log(`StopPopupContent: Received ${arrivals?.length || 0} arrivals for stop ${stop?.stop_id}`);
        if (arrivals && arrivals.length > 0) {
            setIsLoading(false);
            const latestTimestamp = Math.max(...arrivals.map(a => a.timestamp));
            setLastUpdateTime(latestTimestamp);
            //console.log(`StopPopupContent: Set loading false, latest timestamp: ${latestTimestamp}`);
        } else {
            // If we have a stop but no arrivals, we're still loading
            setIsLoading(true);
            //console.log(`StopPopupContent: Set loading true, no arrivals`);
        }
    }, [arrivals, stop?.stop_id]);

    if (!stop) return null;

    // Process arrivals to show the most relevant ones
    const processedArrivals = arrivals
        .filter((update, index, self) => {
            // Deduplicate by tripId + arrivalTime
            const key = `${update.tripId}_${update.arrivalTime}`;
            return index === self.findIndex(u => `${u.tripId}_${u.arrivalTime}` === key);
        })
        .sort((a, b) => a.arrivalTime - b.arrivalTime)
        .slice(0, 5); // Show up to 5 arrivals

    const now = Math.floor(Date.now() / 1000);
    const hasRecentData = lastUpdateTime && (now - lastUpdateTime) < 60; // Data is fresh if less than 1 minute old

    return (
        <>
            <h2 className="text-lg font-semibold">{stop.name}</h2>
            <p className="text-sm text-gray-300">Stop ID: {stop.stop_id}</p>
            {stop.routes && (
                <p className="text-sm text-gray-400 mt-2">
                    Routes: {stop.routes.join(", ")}
                </p>
            )}
            
            {isLoading ? (
                <div className="text-sm text-gray-300 mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-900 rounded-full animate-pulse"></span>
                    Loading arrivals...
                </div>
            ) : processedArrivals.length > 0 ? (
                <div className="mt-4 text-sm text-black">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            <strong className="text-black">Upcoming Arrivals:</strong>
                        </div>
                        {lastUpdateTime && (
                            <span className={`text-xs ${hasRecentData ? 'text-green-600' : 'text-yellow-600'}`}>
                                {hasRecentData ? 'Live' : 'Stale'}
                            </span>
                        )}
                    </div>
                    <ul className="mt-1 space-y-1">
                        {processedArrivals.map((a, i) => (
                            <li key={`${a.tripId}-${i}`} className="flex justify-between items-center">
                                <div>
                                    <span className="font-medium">Route {a.routeId}</span>
                                    <span className="text-gray-600 ml-2">Bus {a.tripId}</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium">
                                        {formatRelativeTime(a.arrivalTime - a.delaySeconds)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatTime(a.arrivalTime - a.delaySeconds)}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {lastUpdateTime && (
                        <p className="text-xs text-gray-500 mt-2">
                            Updated: {formatTime(lastUpdateTime)}
                        </p>
                    )}
                </div>
            ) : (
                <div className="text-sm text-gray-400 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        No upcoming arrivals
                    </div>
                    <p className="text-xs">This stop may not have active buses or the data may be unavailable.</p>
                </div>
            )}
        </>
    );
};

export default StopPopupContent;