import { useState } from 'react';

import MapContainer from './components/MapContainer';
import Menu2 from './components/Menus/SelectMenu'
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
                <Menu2 routeIds={routeIds} setRouteIds={setRouteIds} />
                <ConnectionMonitor />
            </div>
        </MenuProvider>
    );
}

export default App