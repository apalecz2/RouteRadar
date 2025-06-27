import { useState } from 'react';

import MapContainer from './components/MapContainer';
import BusMarkers from './components/BusMarkers';
import Routes from './components/Routes';

import Stops2 from './components/Stops2'

import Menu2 from './components/Menu2'

import TimeDisplay from './components/TimeDisplay';

function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);

    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {map && <BusMarkers map={map} routeIds={routeIds} />}
            {map && <Routes map={map} routeIds={routeIds} />}
            {map && <Stops2 map={map} routeIds={routeIds.map(val => val.replace(/^0+/, ''))} />}
            
            <TimeDisplay />
            <Menu2 routeIds={routeIds} setRouteIds={setRouteIds}/>
            
        </div>
    );
}

export default App