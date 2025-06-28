import { useState, useEffect, useCallback } from 'react';

import MapContainer from './components/MapContainer';
import BusMarkers from './components/BusMarkers';
import Routes from './components/Routes';

import Stops2 from './components/Stops2'

import Menu2 from './components/Menu2'

import TimeDisplay from './components/TimeDisplay';

import BottomPopup from './components/BottomPopup';
import BusPopupContent from './components/BusPopupContent';
import StopPopupContent from './components/StopPopupContent';

function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);

    const [activePopup, setActivePopup] = useState(null);
    const [popupQueue, setPopupQueue] = useState(null);

    useEffect(() => {
        if (activePopup === null && popupQueue) {
            setActivePopup(popupQueue);
            setPopupQueue(null);
        }
    }, [activePopup, popupQueue]);

    const showPopup = (popupData) => {
        if (activePopup) {
            // Queue the new popup, close current one
            setPopupQueue(popupData);
            setActivePopup(null);
        } else {
            setActivePopup(popupData);
        }
    };
    
    const updatePopupData = useCallback((vehicle) => {
        setActivePopup(prevActivePopup => {
            if (prevActivePopup?.type === 'bus' && prevActivePopup.data.VehicleId === vehicle.VehicleId) {
                return { ...prevActivePopup, data: vehicle };
            }
            return prevActivePopup; // Important: always return the previous state if no update is needed
        });
    }, []);
    
    const popupIdentity = activePopup ? `${activePopup.type}:${activePopup.data?.StopId || activePopup.data?.VehicleId}` : null;


    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {map && <BusMarkers map={map} routeIds={routeIds} showPopup={showPopup} updatePopupData={updatePopupData} />}
            {map && <Routes map={map} routeIds={routeIds} />}
            {map && <Stops2 map={map} routeIds={routeIds.map(val => val.replace(/^0+/, ''))} showPopup={showPopup} activePopup={activePopup} />}

            {activePopup && (
                <BottomPopup
                    open={!!activePopup}
                    popupType={popupIdentity}
                    onClose={() => setActivePopup(null)}
                >
                    {activePopup.type === 'bus' && (
                        <BusPopupContent bus={activePopup.data} />
                    )}
                    {activePopup.type === 'stop' && (
                        <StopPopupContent stop={activePopup.data} />
                    )}
                </BottomPopup>
            )}

            <TimeDisplay />
            <Menu2 routeIds={routeIds} setRouteIds={setRouteIds} />

        </div>
    );
}

export default App