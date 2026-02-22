import { useState } from 'react';
import MapContainer from './MapContainer';
import SelectionsManager from './SelectionsManager';
import DisclaimerPopup from './Popups/DisclaimerPopup';
import TimeDisplay from './TimeDisplay';
import Sidebar from './Sidebar';

const MainMap = () => {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);
    const [selection, setSelection] = useState(null);

    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {map && <SelectionsManager map={map} routeIds={routeIds} selection={selection} setSelection={setSelection} />}
            <TimeDisplay />
            <Sidebar routeIds={routeIds} setRouteIds={setRouteIds} selection={selection} setSelection={setSelection} />
            
            <DisclaimerPopup />
        </div>
    );
};

export default MainMap;
