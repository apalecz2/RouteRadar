import Menu from './components/Menu';
import { useState, useEffect } from 'react';
import MapContainer from './components/MapContainer';
import BusMarkers from './components/BusMarkers';
import Routes from './components/Routes';


function App() {
    const [map, setMap] = useState(null);
    const [routeIds, setRouteIds] = useState([]);
    
    const [geometryData, setGeometryData] = useState(null);
    
    
    useEffect(() => {
        const loadData = async () => {
          try {
            const response = await fetch('/2024%20Spring%20LT%20Routes.json');
            const data = await response.json();
            setGeometryData(data);
          } catch (err) {
            console.error('Failed to load route geometry data:', err);
          }
        };
    
        loadData();
      }, []);

    return (
        <div className="relative w-full h-screen">
            <MapContainer onMapLoad={setMap} />
            {map && <BusMarkers map={map} routeIds={routeIds} />}
            {map && <Routes map={map} geometryData={geometryData} routeIds={routeIds} />}
            <Menu routeIds={routeIds} setRouteIds={setRouteIds} />
        </div>
    );
}

export default App
