import React, { useMemo } from "react";
import { useData } from '../Providers/DataProvider';
import AbstractMenu from './Menu';

const RouteSelection = ({ routeIds, setRouteIds }) => {
    const { routes, loading, error } = useData();
    const allRoutes = useMemo(() => {
        if (!routes) return [];
        return [...new Set(routes.map(route => route.id))];
    }, [routes]);

    const handleToggleRoute = (route) => {
        setRouteIds(prev =>
            prev.includes(route)
                ? prev.filter(r => r !== route)
                : [...prev, route]
        );
    };

    return (
        <div>
            <h3 className="font-medium mb-1">Select Routes</h3>
            <ul className="space-y-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {allRoutes.map(route => {
                    const isSelected = routeIds.includes(route);
                    return (
                        <li key={route}>
                            <label
                                className="flex items-center space-x-2 px-2 py-1 rounded cursor-pointer"
                                style={{ color: isSelected ? 'white' : 'black' }}
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
    );
};

const MenuButtonContent = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        height="24px"
        viewBox="0 -960 960 960"
        width="24px"
        fill="#000000"
    >
        <path d="M160-240q-17 0-28.5-11.5T120-280q0-17 11.5-28.5T160-320h640q17 0 28.5 11.5T840-280q0 17-11.5 28.5T800-240H160Zm0-200q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h640q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H160Zm0-200q-17 0-28.5-11.5T120-680q0-17 11.5-28.5T160-720h640q17 0 28.5 11.5T840-680q0 17-11.5 28.5T800-640H160Z"/>
    </svg>
);

const Menu2 = ({ routeIds, setRouteIds }) => {
    return (
        <AbstractMenu
            menuId="main-menu"
            title="Menu"
            buttonContent={MenuButtonContent}
            buttonProps={{
                "aria-label": "Open Menu"
            }}
        >
            <RouteSelection routeIds={routeIds} setRouteIds={setRouteIds} />
        </AbstractMenu>
    );
};

export default Menu2;
