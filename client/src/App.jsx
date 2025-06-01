import Menu from './components/Menu';
import MapWithBuses from './components/MapWithBuses';
import { useState } from 'react';

function App() {
    const [routeIds, setRouteIds] = useState('');
    
    return (
        <div className="relative w-full h-screen">
            <MapWithBuses routeIds={routeIds} />
            <Menu routeIds={routeIds} setRouteIds={setRouteIds} />
        </div>
    );
}

export default App
