import { useState } from 'react';
import MapContainer from './MapContainer';
import SelectMenu from './Menus/SelectMenu';
import HelpMenu from './Menus/HelpMenu';
import TimeDisplay from './TimeDisplay';
import SelectionsManager from './SelectionsManager';
import { MenuProvider } from './Menus/Menu';
import ConnectionMonitor from './Menus/ConnectionMonitor';

const MainMap = () => {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);

    return (
        <MenuProvider>
            <div className="relative w-full h-screen">
                <MapContainer onMapLoad={setMap} />
                {map && <SelectionsManager map={map} routeIds={routeIds} />}
                <TimeDisplay />
                <SelectMenu routeIds={routeIds} setRouteIds={setRouteIds} />
                <HelpMenu />
                <ConnectionMonitor />
            </div>
        </MenuProvider>
    );
};

export default MainMap;
