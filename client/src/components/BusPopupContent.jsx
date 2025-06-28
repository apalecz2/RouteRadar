import { useEffect, useState } from 'react';

const formatTimeAgo = (secondsAgo) => {
    if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
    if (secondsAgo < 120) return `1 minute ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} minutes ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} hours ago`;
    return `${Math.floor(secondsAgo / 86400)} days ago`;
};

const BusPopupContent = ({ bus }) => {
    const [secondsAgo, setSecondsAgo] = useState(() => Math.floor(Date.now() / 1000) - bus.timestamp);

    useEffect(() => {
        // Reset when bus timestamp changes
        setSecondsAgo(Math.floor(Date.now() / 1000) - bus.timestamp);

        const interval = setInterval(() => {
            setSecondsAgo(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [bus.timestamp]);

    const time = new Date(bus.timestamp * 1000).toLocaleString();
    const timeAgo = formatTimeAgo(secondsAgo);

    return (
        <>
            <h2 className="text-lg font-semibold mb-2">Bus {bus.VehicleId}</h2>
            <p className="text-sm text-black mb-1">Route: {bus.RouteId}</p>
            <p className="text-sm text-black mb-1">Destination: {bus.Destination}</p>
            <p className="text-sm text-black mb-1">Lat: {bus.Latitude.toFixed(5)}</p>
            <p className="text-sm text-black mb-1">Lng: {bus.Longitude.toFixed(5)}</p>
            <p className="text-sm text-black mb-1">Bearing: {bus.Bearing}°</p>
            <p className="text-sm text-black mb-1">Time Updated: {time}</p>
            <p className="text-sm text-black italic">({timeAgo})</p>
        </>
    );
};

export default BusPopupContent;
