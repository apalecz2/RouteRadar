import { useState } from "react";

const ALL_ROUTES = ['02', '07', '34', '91', '10', '17']; // Expand as needed

const Menu = ({ routeIds, setRouteIds }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleToggleRoute = (route) => {
    setRouteIds(prev =>
      prev.includes(route)
        ? prev.filter(r => r !== route)
        : [...prev, route]
    );
  };

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
              {ALL_ROUTES.map(route => (
                <li key={route}>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={routeIds.includes(route)}
                      onChange={() => handleToggleRoute(route)}
                    />
                    <span>Route {route}</span>
                  </label>
                </li>
              ))}
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

export default Menu;
