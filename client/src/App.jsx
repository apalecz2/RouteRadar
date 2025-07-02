import { useState } from 'react';

import MapContainer from './components/MapContainer';
import Routes from './components/Routes';
import Menu2 from './components/Menu2'
import TimeDisplay from './components/TimeDisplay';
import SelectionsManager from './components/SelectionsManager';
import TransitDirections from './components/TransitDirections';

function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);

    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            <TransitDirections map={map} />
            {map && <Routes map={map} routeIds={routeIds} />}
            {map && <SelectionsManager map={map} routeIds={routeIds} />}
            <TimeDisplay />
            <Menu2 routeIds={routeIds} setRouteIds={setRouteIds} />
        </div>
    );
}

export default App