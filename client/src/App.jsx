import Menu from './components/Menu';
import { useState } from 'react';
import MapContainer from './components/MapContainer';
import BusMarkers from './components/BusMarkers';
import Routes from './components/Routes';
import Stops from './components/Stops';
import Stops2 from './components/Stops2'

import RouteSelection from './components/RouteSelection'

import Arrivals from './components/ArrivalsTest/Arrivals';

import Menu2 from './components/Menu2'

function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);

    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {map && <BusMarkers map={map} routeIds={routeIds} />}
            {map && <Routes map={map} routeIds={routeIds} />}
            {/*map && <Stops map={map} routeIds={routeIds} />*/}
            {map && <Stops2 map={map} routeIds={routeIds} />}
            {/*<Menu routeIds={routeIds} setRouteIds={setRouteIds} />*/}
            {/*<RouteSelection routeIds={routeIds} setRouteIds={setRouteIds}/>*/}
            <Menu2 routeIds={routeIds} setRouteIds={setRouteIds}/>
        </div>
    );
}

export default App
