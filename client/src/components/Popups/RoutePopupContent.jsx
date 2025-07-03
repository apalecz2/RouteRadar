import React from 'react';

const RoutePopupContent = ({ route }) => {
    if (!route) return null;

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">
                    Route {route.id}
                </h3>
            </div>
            
            {route.name && (
                <div className="mb-2">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="ml-2 text-gray-800">{route.name}</span>
                </div>
            )}
            
            {route.description && (
                <div className="mb-2">
                    <span className="text-sm text-gray-600">Description:</span>
                    <span className="ml-2 text-gray-800">{route.description}</span>
                </div>
            )}
            
            {route.segments && (
                <div className="mb-2">
                    <span className="text-sm text-gray-600">Segments:</span>
                    <span className="ml-2 text-gray-800">{route.segments.length}</span>
                </div>
            )}
            
            {route.stops && (
                <div className="mb-2">
                    <span className="text-sm text-gray-600">Stops:</span>
                    <span className="ml-2 text-gray-800">{route.stops.length}</span>
                </div>
            )}
            
            {route.agency && (
                <div className="mb-2">
                    <span className="text-sm text-gray-600">Agency:</span>
                    <span className="ml-2 text-gray-800">{route.agency}</span>
                </div>
            )}
            
            {route.type && (
                <div className="mb-2">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="ml-2 text-gray-800 capitalize">{route.type}</span>
                </div>
            )}
        </div>
    );
};

export default RoutePopupContent; 