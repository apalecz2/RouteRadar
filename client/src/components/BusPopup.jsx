import BottomPopup from "./BottomPopup";

const BusPopup = ({ bus, onClose }) => {
    if (!bus) return null;
    return (
        <BottomPopup open={!!bus} onClose={onClose}>
            <h2 className="text-lg font-semibold mb-2">Bus {bus.VehicleId}</h2>
            <p className="text-sm text-black mb-1">Route: {bus.RouteId}</p>
            <p className="text-sm text-black mb-1">Destination: {bus.Destination}</p>
            <p className="text-sm text-black mb-1">Lat: {bus.Latitude.toFixed(5)}</p>
            <p className="text-sm text-black mb-1">Lng: {bus.Longitude.toFixed(5)}</p>
            <p className="text-sm text-black">Bearing: {bus.Bearing}°</p>
        </BottomPopup>
    );
};

export default BusPopup