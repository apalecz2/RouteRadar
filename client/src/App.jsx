import { useState } from 'react';

import MapContainer from './components/MapContainer';
import SelectMenu from './components/Menus/SelectMenu'
import HelpMenu from './components/Menus/HelpMenu';
import TimeDisplay from './components/TimeDisplay';
import SelectionsManager from './components/SelectionsManager';
import TransitDirections from './components/Directions/TransitDirections';
import { MenuProvider } from './components/Menus/Menu';

import ConnectionMonitor from './components/Menus/ConnectionMonitor';

function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);

    return (
        <MenuProvider>
            <div className="relative w-full h-screen">
                <MapContainer onMapLoad={setMap} />
                {/*<TransitDirections map={map} />*/}
                {map && <SelectionsManager map={map} routeIds={routeIds} />}
                <TimeDisplay />
                <SelectMenu routeIds={routeIds} setRouteIds={setRouteIds} />
                <HelpMenu />
                <ConnectionMonitor />
            </div>
        </MenuProvider>
    );
}

export default App