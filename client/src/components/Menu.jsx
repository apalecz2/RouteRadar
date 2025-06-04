import { useState, useEffect } from "react";

let allRoutes = [];

const Menu = ({ routeIds, setRouteIds }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [routeColors, setRouteColors] = useState({});

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

                allRoutes = [...new Set(data.map(route => route.id))];

                const colours = {};
                allRoutes.forEach((route, index) => {
                    colours[route] = getRouteColor(index, allRoutes.length);
                });
                setRouteColors(colours);

            } catch (err) {
                console.error('Failed to load route data:', err);
            }
        };

        fetchRoutes();
    }, []);

    return (
        <div>
            <button
                onClick={() => setShowMenu(prev => !prev)}
                className="absolute top-4 right-4 z-20 bg-white p-2 rounded shadow-md hover:bg-gray-100"
            >
                ☰ Menu
            </button>

            {showMenu && (
                <div className="absolute top-16 right-4 z-20 bg-white p-4 rounded shadow-lg w-64">
                    <h2 className="text-lg font-semibold mb-2">Map Options</h2>

                    <div className="mb-4">
                        <h3 className="font-medium mb-1">Select Routes</h3>
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                            {allRoutes.map(route => {
                                const isSelected = routeIds.includes(route);
                                const bgColor = isSelected ? routeColors[route] : '#ffffff';
                                const textColor = isSelected ? 'white' : 'black';

                                return (
                                    <li key={route}>
                                        <label
                                            className="flex items-center space-x-2 px-2 py-1 rounded cursor-pointer"
                                            style={{
                                                backgroundColor: bgColor,
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

                    <ul className="space-y-2">
                        <li><button className="text-blue-600 hover:underline">Toggle Markers</button></li>
                        <li><button className="text-blue-600 hover:underline">Change Style</button></li>
                        <li><button className="text-blue-600 hover:underline">Recenter</button></li>
                    </ul>
                </div>
            )}
        </div>
    );
};

function getRouteColor(index, totalRoutes) {
    const hue = (index * 360 / totalRoutes) % 360;
    const saturation = 70;
    const lightness = 50;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default Menu;
