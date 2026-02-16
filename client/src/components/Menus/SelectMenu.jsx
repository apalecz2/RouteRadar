import { useMemo, useState } from "react";
import { useData } from "../Providers/DataProvider";
import AbstractMenu from "./Menu";
import { getRouteColor, getRouteHighlightColor } from "../../utils/getRouteColor";

const RouteSelection = ({ routeIds, setRouteIds }) => {
    const { routes } = useData();
    const [query, setQuery] = useState("");

    const allRoutes = useMemo(() => {
        if (!routes) return [];
        return [...new Set(routes.map(route => route.id))];
    }, [routes]);

    const filteredRoutes = useMemo(() => {
        if (!query) return allRoutes;
        const normalizedQuery = query.trim().toLowerCase();
        return allRoutes.filter(route =>
            String(route).toLowerCase().includes(normalizedQuery)
        );
    }, [allRoutes, query]);

    const handleToggleRoute = (route) => {
        setRouteIds(prev =>
            prev.includes(route)
                ? prev.filter(r => r !== route)
                : [...prev, route]
        );
    };

    return (
        <div className="p-2">
            <div className="flex items-baseline justify-between gap-2 mb-2">
                <div>
                    <h3 className="font-semibold text-lg text-gray-800">Routes</h3>
                    <p className="text-xs text-gray-500">
                        {routeIds.length} selected • {allRoutes.length} total
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
                        onClick={() => setRouteIds(allRoutes)}
                    >
                        Select all
                    </button>
                    <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
                        onClick={() => setRouteIds([])}
                    >
                        Clear
                    </button>
                </div>
            </div>
            <div className="mb-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search routes..."
                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    aria-label="Search routes"
                />
            </div>
            <ul className="space-y-1 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
                {filteredRoutes.map((route, index) => {
                    const isSelected = routeIds.includes(route);
                    const bgColor = isSelected
                        ? getRouteColor(index)
                        : undefined;
                    const hoverColor = isSelected
                        ? getRouteHighlightColor(index)
                        : '#f3f4f6'; // fallback hover color for unselected (Tailwind gray-100)

                    return (
                        <li key={route}>
                            <label
                                className={
                                    "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition text-sm font-medium"
                                }
                                style={{
                                    backgroundColor: bgColor,
                                    color: isSelected ? "white" : "black",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = hoverColor;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = "";
                                    }
                                }}
                            >
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300"
                                    checked={isSelected}
                                    onChange={() => handleToggleRoute(route)}
                                />
                                <span>Route {route}</span>
                            </label>
                        </li>
                    );
                })}
                {filteredRoutes.length === 0 && (
                    <li className="text-sm text-gray-500 px-3 py-2">
                        No routes match your search.
                    </li>
                )}
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
        fill="currentColor"
    >
        <path d="M160-240q-17 0-28.5-11.5T120-280q0-17 11.5-28.5T160-320h640q17 0 28.5 11.5T840-280q0 17-11.5 28.5T800-240H160Zm0-200q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h640q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H160Zm0-200q-17 0-28.5-11.5T120-680q0-17 11.5-28.5T160-720h640q17 0 28.5 11.5T840-680q0 17-11.5 28.5T800-640H160Z" />
    </svg>
);

const Menu2 = ({ routeIds, setRouteIds }) => {
    return (
        <AbstractMenu
            menuId="main-menu"
            title="Route Selection"
            buttonContent={MenuButtonContent}
            order={0}
            buttonProps={{
                "aria-label": "Open Menu",
            }}
        >
            <RouteSelection routeIds={routeIds} setRouteIds={setRouteIds} />
        </AbstractMenu>
    );
};

export default Menu2;
