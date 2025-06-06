import Menu from './components/Menu';
import { useState } from 'react';
import MapContainer from './components/MapContainer';
import BusMarkers from './components/BusMarkers';
import Routes from './components/Routes';
import Stops from './components/Stops';

import RouteSelection from './components/RouteSelection'

function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);

    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {map && <BusMarkers map={map} routeIds={routeIds} />}
            {map && <Routes map={map} routeIds={routeIds} />}
            {map && <Stops map={map} routeIds={routeIds} />}
            <Menu routeIds={routeIds} setRouteIds={setRouteIds} />
            <RouteSelection routeIds={routeIds} setRouteIds={setRouteIds}/>
        </div>
    );
}

export default App
