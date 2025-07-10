import React from "react";
import AbstractMenu from './Menu';

const HelpContent = () => {
    return (
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto space-y-6 pr-4">
            <div>
                <h3 className="font-semibold text-lg mb-3">How to Use the Bus Tracker</h3>
                <p className="text-sm text-gray-800 dark:text-gray-800 mb-4">
                    Welcome! This interactive map helps you track buses, stop arrivals and departures in real-time.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="font-medium text-base mb-2">Main Features</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-700 space-y-2 ml-4">
                        <li>• <strong>Interactive Map:</strong> View bus routes and stops on an interactive map</li>
                        <li>• <strong>Route Selection:</strong> Choose which bus routes to display on the map</li>
                        <li>• <strong>Real-time Updates:</strong> See live bus locations and route information</li>
                        <li>• <strong>Stop Information:</strong> Click on stops to view detailed information</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-medium text-base mb-2">How to Navigate</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-700 space-y-2 ml-4">
                        <li>• <strong>Menu Button (☰):</strong> Open the main menu to select which routes to display</li>
                        <li>• <strong>Map Interaction:</strong> Click and drag to pan, scroll to zoom in/out</li>
                        <li>• <strong>Bus Markers:</strong> Click on bus icons to see current location and route info</li>
                        <li>• <strong>Stop Markers:</strong> Click on stop icons to view stop details and schedules</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-medium text-base mb-2">Route Selection</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-700 space-y-2 ml-4">
                        <li>• Open the menu using the ☰ button in the top-left corner</li>
                        <li>• Check/uncheck routes to show/hide them on the map</li>
                        <li>• Selected routes will display with colored lines and bus markers</li>
                        <li>• You can select multiple routes to compare different bus lines</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-medium text-base mb-2">Time Display</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-700 space-y-2 ml-4">
                    <li>• The current time is displayed in the top-right corner</li>
                    <li>• This helps you track when buses are expected to arrive</li>
                    <li>• All times shown are in your local timezone</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-medium text-base mb-2">Connection Status</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-700 space-y-2 ml-4">
                        <li>• The app shows real-time connection status</li>
                        <li>• Green indicator means connected and receiving live data</li>
                        <li>• Red indicator means disconnected - check your internet connection</li>
                    </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-base mb-2 text-gray-800 dark:text-gray-800">Tips</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-700 space-y-1 ml-4">
                        <li>• Use the zoom controls to get a better view of specific areas</li>
                        <li>• Try selecting different route combinations to find the best route for your journey</li>
                        <li>• The map automatically updates with new bus positions</li>
                        <li>• You can reset the map view by refreshing the page</li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-medium text-lg mb-2">Contact & Info</h4>
                    <div className="text-sm text-gray-700 dark:text-gray-700 space-y-2">
                        <p className="mb-3">
                            <strong> Hi! I'm Aiden. </strong><br/>
                            If you're interested in working together or have any questions about this project, 
                            feel free to reach out! <br />
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-100 p-3 rounded-lg">
                            <p className="font-medium mb-1">Email:</p>
                            <p className="text-blue-600 dark:text-blue-700">aiden.paleczny@gmail.com</p>
                        </div>
                        <p>
                            <strong>Some notes on the project: </strong><br/>
                            Although this is a intended as a software engineering portfolio project, 
                            it still provides accurate and up to date info from London Transit. <br/>
                            <strong>Tech Stack: </strong> <br/>
                            React + Vite, Tailwind, GraphQL, NodeJS + Express
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HelpButtonContent = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-280q17 0 28.5-11.5T520-320v-160q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480v160q0 17 11.5 28.5T480-280Zm0-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
);

const HelpMenu = () => {
    return (
        <AbstractMenu
            menuId="help-menu"
            title="Help & Instructions"
            buttonContent={HelpButtonContent}
            order={1}
            buttonProps={{
                "aria-label": "Open Help Menu"
            }}
        >
            <HelpContent />
        </AbstractMenu>
    );
};

export default HelpMenu; 