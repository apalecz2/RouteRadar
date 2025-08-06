import { useMemo } from "react";
import { useData } from "../Providers/DataProvider";
import AbstractMenu from "./Menu";
import { getRouteColor, getRouteHighlightColor } from "../../utils/getRouteColor";

const RouteSelection = ({ routeIds, setRouteIds }) => {
    const { routes } = useData();

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
        <div className="p-2">
            <div className="flex justify-between items-baseline mb-2">
                <h3 className="font-semibold text-lg text-gray-800">Routes</h3>
                <p className="text-sm text-gray-500">(Click to toggle)</p>
            </div>
            <ul className="space-y-1 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
                {allRoutes.map((route, index) => {
                    const isSelected = routeIds.includes(route);
                    const bgColor = isSelected
                        ? getRouteColor(index, allRoutes.length)
                        : undefined;
                    const hoverColor = isSelected
                        ? getRouteHighlightColor(index, allRoutes.length)
                        : '#f3f4f6'; // fallback hover color for unselected (Tailwind gray-100)

                    return (
                        <li key={route}>
                            <label
                                className={`
                                    flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition
                                    text-sm font-medium
                                `}
                                style={{
                                    backgroundColor: bgColor,
                                    color: isSelected ? 'white' : 'black',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = hoverColor;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = '';
                                    }
                                }}
                            >
                                <input
                                    type="checkbox"
                                    className="hidden"
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
