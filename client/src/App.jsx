import { useState } from 'react';

import MapContainer from './components/MapContainer';
import Routes from './components/Routes';
import Menu2 from './components/Menu2'
import TimeDisplay from './components/TimeDisplay';
import SelectionsManager from './components/SelectionsManager';

function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);
    
    //const debuggingRoutes = ['02']
    
    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {map && <Routes map={map} routeIds={routeIds} />}
            {/*map && <Routes map={map} routeIds={debuggingRoutes} />*/}
            
            {map && <SelectionsManager map={map} routeIds={routeIds} />}
            {/*map && <SelectionsManager map={map} routeIds={debuggingRoutes} /> */}
            
            <TimeDisplay />
            <Menu2 routeIds={routeIds} setRouteIds={setRouteIds} />
        
        </div>
    );
}

export default App