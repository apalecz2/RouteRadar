import { useState, useEffect, useCallback, useRef } from 'react';

import MapContainer from './components/MapContainer';
import BusMarkers from './components/BusMarkers';
import Routes from './components/Routes';

import Stops2 from './components/Stops2'

import Menu2 from './components/Menu2'

import TimeDisplay from './components/TimeDisplay';

import BottomPopup from './components/BottomPopup';
import BusPopupContent from './components/BusPopupContent';
import StopPopupContent from './components/StopPopupContent';


import SelectionsManager from './components/SelectionsManager';






function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);
    
    
    
    
    /*

    const [activePopup, setActivePopup] = useState(null);
    const [popupQueue, setPopupQueue] = useState(null);

    const [selectedBus, setSelectedBus] = useState(null);

    const [isClosing, setIsClosing] = useState(false);

    const lastPopupRef = useRef(null);
    useEffect(() => {
        // Always store the most recently intended popup (even if it's queued)
        if (activePopup) {
            lastPopupRef.current = activePopup;
        } else if (popupQueue) {
            lastPopupRef.current = popupQueue;
        }
    }, [activePopup, popupQueue]);

    useEffect(() => {
        if (activePopup === null && popupQueue && !isClosing) {
            setActivePopup(popupQueue);
            setPopupQueue(null);
        }
    }, [activePopup, popupQueue, isClosing]);

    const showPopup = useCallback((popupData) => {
        if (popupData.type === 'bus') {
            setSelectedBus(popupData.data.VehicleId);
        } else {
            setSelectedBus(null);
        }

        setActivePopup(currentActivePopup => {
            if (currentActivePopup) {
                setPopupQueue(popupData);
                setIsClosing(true); // trigger close animation first
                return currentActivePopup; // keep current popup rendered
            } else {
                lastPopupRef.current = popupData;
                return popupData;
            }
        });
    }, []);


    useEffect(() => {
        if (isClosing) {
            // After animation duration, fully close popup
            const timeout = setTimeout(() => {
                setActivePopup(null);
                setIsClosing(false);
            }, 300); // must match animation duration

            return () => clearTimeout(timeout);
        }
    }, [isClosing]);

    const handleClosePopup = useCallback(() => {
        setIsClosing(true);
    }, []);

    const updatePopupData = useCallback((vehicle) => {
        setActivePopup(prevActivePopup => {
            if (prevActivePopup?.type === 'bus' && prevActivePopup.data.VehicleId === vehicle.VehicleId) {
                return { ...prevActivePopup, data: vehicle };
            }
            return prevActivePopup; // Important: always return the previous state if no update is needed
        });
    }, []);

    const updateStopData = useCallback((stopId, arrivals) => {
        setActivePopup(prevActivePopup => {
            if (prevActivePopup?.type === 'stop' && prevActivePopup.data.stop_id === stopId) {
                return { ...prevActivePopup, arrivals };
            }
            return prevActivePopup;
        });
    }, []);

    const popupIdentity = activePopup ? `${activePopup.type}:${activePopup.data?.StopId || activePopup.data?.VehicleId || activePopup.data?.stop_id}` : null;

    */
    
    
    /*
    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {map && <BusMarkers map={map} routeIds={routeIds} showPopup={showPopup} updatePopupData={updatePopupData} selectedBus={selectedBus} />}
            {map && <Routes map={map} routeIds={routeIds} />}
            {map && <Stops2 map={map} routeIds={routeIds.map(val => val.replace(/^0+/, ''))} showPopup={showPopup} activePopup={activePopup} updateStopData={updateStopData} />}

            <BottomPopup
                open={!isClosing && !!activePopup}
                popupType={popupIdentity}
                onClose={handleClosePopup}
                isClosing={isClosing} // pass closing state
                triggerClose={() => setIsClosing(true)}
            >
                {lastPopupRef.current?.type === 'bus' && (
                    <BusPopupContent bus={lastPopupRef.current.data} />
                )}
                {lastPopupRef.current?.type === 'stop' && (
                    <StopPopupContent stop={lastPopupRef.current.data} arrivals={lastPopupRef.current.arrivals} />
                )}
            </BottomPopup>

            <TimeDisplay />
            <Menu2 routeIds={routeIds} setRouteIds={setRouteIds} />

        </div>
    );
    */
   
    const debuggingRoutes = ['02']
    
    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {/*map && <Routes map={map} routeIds={routeIds} />*/}
            {map && <Routes map={map} routeIds={debuggingRoutes} />}
            
            
            {/*map && <SelectionsManager map={map} routeIds={routeIds} />*/}
            {map && <SelectionsManager map={map} routeIds={debuggingRoutes} />}
            
            
            
            
            
        
        
        
            <TimeDisplay />
            <Menu2 routeIds={routeIds} setRouteIds={setRouteIds} />
        
        </div>
    );
}

export default App