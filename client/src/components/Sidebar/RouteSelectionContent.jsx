import { useState, useMemo } from 'react';
import { useData } from '../Providers/DataProvider';
import { getRouteColor, getRouteHighlightColor } from '../../utils/getRouteColor';

const RouteSelectionContent = ({ routeIds, setRouteIds }) => {
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
        <div className="space-y-4">
            <div className="flex items-baseline justify-between mb-2">
                <div>
                    <h3 className="font-semibold text-xl text-gray-800">Routes</h3>
                    <p className="text-sm text-gray-500">
                        {routeIds.length} selected • {allRoutes.length} total
                    </p>
                </div>
            </div>

            <input
                type="text"
                placeholder="Search routes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-black bg-white"
            />

            <div className="flex gap-2 mb-4">
                <button
                    type="button"
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
                    onClick={() => setRouteIds([])}
                >
                    Clear All
                </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {filteredRoutes.map(route => {
                    const isSelected = routeIds.includes(route);
                    const index = allRoutes.indexOf(route);
                    const bgColor = isSelected ? getRouteColor(index) : undefined;
                    const hoverColor = isSelected ? getRouteHighlightColor(index) : '#f9fafb';

                    return (
                        <button
                            key={route}
                            onClick={() => handleToggleRoute(route)}
                            className={`
                                flex items-center p-3 rounded-xl border text-left transition-all
                                ${isSelected
                                    ? 'shadow-sm text-white'
                                    : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 text-gray-700'
                                }
                            `}
                            style={{
                                backgroundColor: bgColor,
                                borderColor: isSelected ? 'transparent' : undefined
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
                            <span className="flex-1 font-medium">
                                Route {route}
                            </span>
                            {isSelected && (
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    );
                })}
                {filteredRoutes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No routes found
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteSelectionContent;