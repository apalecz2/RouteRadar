import { useState, useEffect } from 'react';
import { gql, useSubscription } from '@apollo/client';

const STOP_UPDATES_SUB = gql`
    subscription($stopId: String!) {
        stopUpdates(stopId: $stopId) {
            stopId
            routeId
            tripId
            arrivalTime
            delaySeconds
            timestamp
        }
    }
`;

function formatTime(unixSeconds) {
    const date = new Date(unixSeconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', });
}

const StopPopupContent = ({ stop }) => {

    const [activeStop, setActiveStop] = useState(null);

    // FOR LIVE UPDATES
    const { data: stopDataLive } = useSubscription(STOP_UPDATES_SUB, {
        variables: { stopId: activeStop?.stop_id },
        skip: !activeStop,
    });

    useEffect(() => {
        if (stop) setActiveStop(stop);
        else setActiveStop(null);
    }, [stop]);

    if (!activeStop) return null;


    // FOR LIVE ARRIVALS
    const arrivals = stopDataLive?.stopUpdates
        ?.filter((update, index, self) => {
            // Deduplicate by tripId + arrivalTime
            const key = `${update.tripId}_${update.arrivalTime}`;
            return index === self.findIndex(u => `${u.tripId}_${u.arrivalTime}` === key);
        })
        .sort((a, b) => a.arrivalTime - b.arrivalTime)
        .slice(0, 3) ?? [];

    const loadingArrivals = activeStop && !stopDataLive;

    return (
        <>
            <h2 className="text-lg font-semibold">{activeStop.name}</h2>
            <p className="text-sm text-gray-300">Stop ID: {activeStop.stop_id}</p>
            {activeStop.routes && (
                <p className="text-sm text-gray-400 mt-2">
                    Routes: {activeStop.routes.join(", ")}
                </p>
            )}
            {loadingArrivals ? (
                <div className="text-sm text-gray-300 mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-900 rounded-full animate-pulse"></span>
                    Loading arrivals...
                </div>
            ) : arrivals.length > 0 ? (
                <div className="mt-4 text-sm text-black">
                    <div className="text-sm text-red-300 mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-800 rounded-full animate-pulse"></span>
                        <strong className="text-black">Upcoming Arrivals:</strong>
                    </div>
                    <ul className="mt-1 list-disc list-inside">
                        {arrivals.map((a, i) => (
                            <li key={`${a.tripId}-${i}`}>
                                {formatTime(a.arrivalTime - a.delaySeconds)} – Route {a.routeId} – Bus {a.tripId}
                            </li>
                        ))}
                    </ul>
                    <p>Updated: {formatTime(stopDataLive.stopUpdates[0].timestamp)}</p>
                    {<ul className="mt-1 list-disc list-inside overflow-scroll">
                        {stopDataLive?.stopUpdates.map((a, i) => (
                            <li key={`${a.tripId}-${i}`}>
                                {formatTime(a.arrivalTime)} – Route {a.routeId} – Bus {a.tripId}
                            </li>
                        ))}
                    </ul>}
                </div>
            ) : (
                <p className="text-sm text-gray-400 mt-4">No upcoming arrivals</p>
            )}
        </>
    );
};

export default StopPopupContent;