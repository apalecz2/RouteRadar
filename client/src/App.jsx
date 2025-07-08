import { useState } from 'react';

import MapContainer from './components/MapContainer';
import Menu2 from './components/Menu2'
import TimeDisplay from './components/TimeDisplay';
import SelectionsManager from './components/SelectionsManager';
import TransitDirections from './components/Directions/TransitDirections';

import ConnectionMonitor from './components/ConnectionMonitor';

function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);

    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {/*<TransitDirections map={map} />*/}
            {map && <SelectionsManager map={map} routeIds={routeIds} />}
            <TimeDisplay />
            <Menu2 routeIds={routeIds} setRouteIds={setRouteIds} />
            <ConnectionMonitor />
        </div>
    );
}

export default App