import { useState, useEffect } from 'react';

function formatTime(unixSeconds) {
    const date = new Date(unixSeconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', });
}

const StopPopupContent = ({ stop, arrivals = [] }) => {
    if (!stop) return null;

    // Process arrivals to show the most relevant ones
    const processedArrivals = arrivals
        .filter((update, index, self) => {
            // Deduplicate by tripId + arrivalTime
            const key = `${update.tripId}_${update.arrivalTime}`;
            return index === self.findIndex(u => `${u.tripId}_${u.arrivalTime}` === key);
        })
        .sort((a, b) => a.arrivalTime - b.arrivalTime)
        .slice(0, 3);

    const loadingArrivals = stop && arrivals.length === 0;

    return (
        <>
            <h2 className="text-lg font-semibold">{stop.name}</h2>
            <p className="text-sm text-gray-300">Stop ID: {stop.stop_id}</p>
            {stop.routes && (
                <p className="text-sm text-gray-400 mt-2">
                    Routes: {stop.routes.join(", ")}
                </p>
            )}
            {loadingArrivals ? (
                <div className="text-sm text-gray-300 mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-900 rounded-full animate-pulse"></span>
                    Loading arrivals...
                </div>
            ) : processedArrivals.length > 0 ? (
                <div className="mt-4 text-sm text-black">
                    <div className="text-sm text-red-300 mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-800 rounded-full animate-pulse"></span>
                        <strong className="text-black">Upcoming Arrivals:</strong>
                    </div>
                    <ul className="mt-1 list-disc list-inside">
                        {processedArrivals.map((a, i) => (
                            <li key={`${a.tripId}-${i}`}>
                                {formatTime(a.arrivalTime - a.delaySeconds)} – Route {a.routeId} – Bus {a.tripId}
                            </li>
                        ))}
                    </ul>
                    {arrivals.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                            Updated: {formatTime(arrivals[0].timestamp)}
                        </p>
                    )}
                </div>
            ) : (
                <p className="text-sm text-gray-400 mt-4">No upcoming arrivals</p>
            )}
        </>
    );
};

export default StopPopupContent;