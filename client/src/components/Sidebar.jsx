import { useState, useEffect } from 'react';
import { connectionStatus } from '../utils/connectionStatus';
import SidebarTab from './Sidebar/SidebarTab';
import RouteSelectionContent from './Sidebar/RouteSelectionContent';
import HelpContent from './Sidebar/HelpContent';
import ConnectionContent from './Sidebar/ConnectionContent';
import SelectionDetails from './Sidebar/SelectionDetails';

const Sidebar = ({ routeIds, setRouteIds, selection, setSelection }) => {
    const [activeTab, setActiveTab] = useState(null);
    const [connectionState, setConnectionState] = useState(connectionStatus.get());
    const [isExpanded, setIsExpanded] = useState(false); // Mobile expansion state: false = half, true = full

    useEffect(() => {
        const unsubscribe = connectionStatus.subscribe(setConnectionState);
        return () => unsubscribe();
    }, []);

    // Switch to details tab when selection changes
    useEffect(() => {
        if (selection) {
            setActiveTab('details');
            setIsExpanded(false); // Reset to half height when selection changes
        }
    }, [selection]);

    const toggleTab = (tab) => {
        if (activeTab === tab) {
            // If tapping the active tab again, close it
            setActiveTab(null);
            if (tab === 'details') {
                setSelection(null);
            }
        } else {
            setActiveTab(tab);
            setIsExpanded(false); // Reset to half height when opening new tab
        }
    };

    const handleClose = () => {
        setActiveTab(null);
        setIsExpanded(false);
        if (activeTab === 'details') {
             setSelection(null);
        }
    };

    // Touch handling for swipe gestures
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientY);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientY);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isUpSwipe = distance > minSwipeDistance;
        const isDownSwipe = distance < -minSwipeDistance;

        if (isUpSwipe) {
            if (!isExpanded) {
                setIsExpanded(true);
            }
        } else if (isDownSwipe) {
            if (isExpanded) {
                setIsExpanded(false);
            } else {
                handleClose();
            }
        }
        // Reset touches
        setTouchStart(null);
        setTouchEnd(null);
    };

    // Determine details icon based on selection type
    const getDetailsIcon = () => {
        if (selection?.type === 'bus') return 'directions_bus';
        if (selection?.type === 'stop') return 'pin_drop'; // or where_to_vote / location_on
        if (selection?.type === 'route') return 'route';
        return 'info';
    };

    return (
        <>
            {/* Desktop Sidebar (Left) */}
            <div className="hidden md:flex fixed top-0 left-0 h-full z-[1000] pointer-events-none">
                {/* Icon Bar */}
                <div className="h-full w-20 bg-white border-r border-gray-200 shadow-xl flex flex-col items-center py-6 gap-6 pointer-events-auto z-20">
                    
                    <SidebarTab 
                        isActive={activeTab === 'routes'} 
                        onClick={() => toggleTab('routes')}
                        icon={<span className="material-symbols-outlined text-2xl">alt_route</span>}
                        label="Routes"
                    />

                    {/* Dynamic Details Tab (only shows when selection exists) */}
                     <div className={`transition-all duration-300 ${!selection ? 'opacity-0 scale-50 h-0 overflow-hidden' : 'opacity-100 scale-100 h-20'}`}>
                         <SidebarTab 
                            isActive={activeTab === 'details'} 
                            onClick={() => toggleTab('details')}
                            icon={<span className="material-symbols-outlined text-2xl">{getDetailsIcon()}</span>}
                            label="Details"
                        />
                    </div>
                   
                    <div className="mt-auto flex flex-col items-center gap-6">
                        <SidebarTab 
                            isActive={activeTab === 'help'} 
                            onClick={() => toggleTab('help')}
                            icon={<span className="material-symbols-outlined text-2xl">help</span>}
                            label="Help"
                        />

                        <SidebarTab 
                            isActive={activeTab === 'connection'} 
                            onClick={() => toggleTab('connection')}
                            icon={
                                <span className={`material-symbols-outlined text-2xl ${!connectionState.connected ? 'text-red-500' : ''}`}>
                                    {!connectionState.connected ? 'wifi_off' : 'wifi'}
                                </span>
                            }
                            label="Status"
                            alert={!connectionState.connected}
                        />
                    </div>
                </div>

                {/* Content Panel - Slides out to the right */}
                <div 
                    className={`
                        h-full bg-white shadow-2xl transition-all duration-300 ease-in-out pointer-events-auto
                        border-r border-gray-200
                        flex flex-col relative
                        ${activeTab ? 'w-96 opacity-100' : 'w-0 opacity-0'}
                    `}
                >
                    {/* Close Button (Desktop) */}
                    <button 
                         onClick={handleClose}
                         className={`
                            absolute -right-3 top-1/2 -translate-y-1/2 
                            w-6 h-12 
                            bg-white border border-gray-200 rounded-r-md shadow-md 
                            flex items-center justify-center 
                            text-gray-400 hover:text-gray-600 hover:bg-gray-50 
                            z-50 cursor-pointer
                            transition-opacity duration-300
                            ${activeTab ? 'opacity-100 delay-200' : 'opacity-0'}
                        `}
                        aria-label="Close sidebar"
                    >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-w-[20rem]">
                        {activeTab === 'routes' && <RouteSelectionContent routeIds={routeIds} setRouteIds={setRouteIds} />}
                        {activeTab === 'details' && <SelectionDetails selection={selection} />}
                        {activeTab === 'help' && <HelpContent />}
                        {activeTab === 'connection' && <ConnectionContent />}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar Container */}
            <div className="md:hidden fixed inset-0 z-[1000] pointer-events-none flex flex-col justify-end">
                
                {/* Backdrop Area - Closes on click */}
                {activeTab && (
                    <div 
                        className="absolute inset-0 bg-black/20 pointer-events-auto transition-opacity duration-300"
                        onClick={handleClose}
                    />
                )}

                {/* Mobile Content Panel - Slides up from bottom */}
                <div 
                    className={`
                        bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] 
                        transition-all duration-300 ease-in-out pointer-events-auto
                        rounded-t-2xl overflow-hidden flex flex-col
                        relative z-10
                        ${!activeTab ? 'h-0 opacity-0 translate-y-4' : 
                          isExpanded ? 'h-[calc(100vh-6rem)] opacity-100 translate-y-0' : 'h-[60vh] opacity-100 translate-y-0'}
                    `}
                >
                    {/* Pull Handle / Close Bar */}
                    <div 
                        className="h-8 flex-shrink-0 flex items-center justify-center bg-gray-50 border-b border-gray-100 cursor-grab active:cursor-grabbing touch-none"
                         onClick={() => {
                             if (isExpanded) setIsExpanded(false);
                             else handleClose();
                         }}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
                        {activeTab === 'routes' && <RouteSelectionContent routeIds={routeIds} setRouteIds={setRouteIds} />}
                        {activeTab === 'details' && <SelectionDetails selection={selection} />}
                        {activeTab === 'help' && <HelpContent />}
                        {activeTab === 'connection' && <ConnectionContent />}
                    </div>
                </div>

                {/* Mobile Navigation Bar */}
                <div className="bg-white border-t border-gray-200 shadow-xl pointer-events-auto pb-safe relative z-20">
                    <div className="flex justify-evenly items-center h-16 px-2">
                        <div className="flex-1 flex justify-center">
                            <SidebarTab 
                                isActive={activeTab === 'routes'} 
                                onClick={() => toggleTab('routes')}
                                icon={<span className="material-symbols-outlined text-2xl">alt_route</span>}
                                label="Routes"
                            />
                        </div>

                         {/* Dynamic Details Tab (Mobile) */}
                         <div className={`flex-1 flex justify-center transition-all duration-300 overflow-hidden ${!selection ? 'flex-grow-0 max-w-0 opacity-0' : 'flex-grow-1 max-w-full opacity-100'}`}>
                              <SidebarTab 
                                isActive={activeTab === 'details'} 
                                onClick={() => toggleTab('details')}
                                icon={<span className="material-symbols-outlined text-2xl">{getDetailsIcon()}</span>}
                                label="Details"
                            />
                         </div>
                        
                        <div className="flex-1 flex justify-center">
                            <SidebarTab 
                                isActive={activeTab === 'connection'} 
                                onClick={() => toggleTab('connection')}
                                icon={
                                    <span className={`material-symbols-outlined text-2xl ${!connectionState.connected ? 'text-red-500' : ''}`}>
                                        {!connectionState.connected ? 'wifi_off' : 'wifi'}
                                    </span>
                                }
                                label="Status"
                                alert={!connectionState.connected}
                            />
                        </div>

                        <div className="flex-1 flex justify-center">
                            <SidebarTab 
                                isActive={activeTab === 'help'} 
                                onClick={() => toggleTab('help')}
                                icon={<span className="material-symbols-outlined text-2xl">help</span>}
                                label="Help"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
