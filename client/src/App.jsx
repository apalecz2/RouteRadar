import Map from './components/Map';
import Menu from './components/Menu';


import MapWithBuses from './components/MapWithBuses';
import React, { useState } from 'react';

function App() {
    const [routeId, setRouteId] = useState('');
    
    
    return (
        <MapWithBuses routeId="91" />
    )
    
    
    /*
    return (
        <div className="relative w-full h-screen">
            <Map />
            <Menu />
        </div>
    )
        */
}

export default App
