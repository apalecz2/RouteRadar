import { useState, useEffect } from "react";


const RouteSelection = ({ routeIds, setRouteIds }) => {

    const [allRoutes, setAllRoutes] = useState([]);

const handleToggleRoute = (route) => {
        setRouteIds(prev =>
            prev.includes(route)
                ? prev.filter(r => r !== route)
                : [...prev, route]
        );
    };

    useEffect(() => {
            const fetchRoutes = async () => {
                try {
                    const response = await fetch('/routes.json');
                    const data = await response.json();
    
                    setAllRoutes([...new Set(data.map(route => route.id))]);
                    
                    /*
                    const colours = {};
                    allRoutes.forEach((route, index) => {
                        colours[route] = getRouteColor(index, allRoutes.length);
                    });
                    setRouteColors(colours);
                    */
    
                } catch (err) {
                    console.error('Failed to load route data:', err);
                }
            };
    
            fetchRoutes();
        }, []);










    /*
    return (

        <div
            className={`
                fixed top-4 md:top-8
                left-1/2 md:left-4
                transform -translate-x-1/2 md:translate-x-0
                w-[90%] md:w-[420px] max-w-[95%]
                h-auto min-h-[calc(100vh-4rem)] 
                rounded-2xl md:rounded-3xl
              bg-white/10 dark:bg-gray-800/20
                backdrop-blur-2xl
                border border-white/30 dark:border-white/20
                p-6
                z-50
                overflow-y-auto
            `}
        >
            <h1>test</h1>
        </div>

    )
*/
    return (
    <div
      className={`
        fixed top-8
        left-1/2 md:left-6
        transform -translate-x-1/2 md:translate-x-0
        w-[90%] md:w-[420px] max-w-[95%]
        h-auto min-h-[calc(100vh-4rem)]
        p-6 z-50 overflow-y-auto

        rounded-2xl md:rounded-3xl
        bg-white/10 dark:bg-white/5
        backdrop-blur-2xl

        border border-white/30 dark:border-white/15
        shadow-2xl

        before:content-[''] before:absolute before:inset-0
        before:rounded-2xl md:before:rounded-3xl
        before:bg-gradient-to-br before:from-white/40 before:to-white/0
        before:pointer-events-none
      `}
    >
      {/* Content */}
      <div className="relative z-10 text-center">
        <h2 className="text-black text-2xl font-semibold mb-4">Menu</h2>
      </div>
      <div>
            <h3 className="font-medium mb-1">Select Routes</h3>
                        <ul className="space-y-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
                            {allRoutes.map(route => {
                                const isSelected = routeIds.includes(route);
                                //const bgColor = isSelected ? routeColors[route] : '#ffffff';
                                const textColor = isSelected ? 'white' : 'black';

                                return (
                                    <li key={route}>
                                        <label
                                            className="flex items-center space-x-2 px-2 py-1 rounded cursor-pointer"
                                            style={{
                                                color: textColor,
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleRoute(route)}
                                            />
                                            <span>Route {route}</span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
      </div>
    </div>
  );



}

export default RouteSelection