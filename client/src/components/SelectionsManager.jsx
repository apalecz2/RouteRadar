// Now all markers on the map are managed from here. This includes popups. All selections stem from here

// There is one state for the currently selected object. The object has the id, and type
// If this changes, the popup needs to be updated, and ping animations etc

import { useState, useEffect, useRef, useCallback } from 'react';

import StopMarkers from './StopMarkers';
import BusMarkers2 from './BusMarkers2';
import PopupManager from './PopupManager';

const SelectionsManager = ({ map, routeIds }) => {

    const [selection, setSelection] = useState(null);
    const selectionRef = useRef(selection);
    useEffect(() => {
        selectionRef.current = selection;
    }, [selection]);

    // Allow child components to register pin factories
    const pinCreatorsRef = useRef({});

    // Tracks the marker (if any) that is currently highlighted and showing ping (generic to bus / stop etc)
    const highlightedMarkerRef = useRef(null);

    // Store references to markers for updating selection data
    const markersRef = useRef({});


    // Handles a marker clicked, obj: the content, type: string - stop, bus..., marker: reference to actual map marker
    const handleMarkerClicked = useCallback((obj, type, marker) => {
        const id = obj.stop_id || obj.VehicleId || obj.id;

        // Store marker reference for updates
        markersRef.current[id] = marker;

        // Use the ref here to prevent needing 'selection' in the dependency array
        if (!selectionRef.current || id !== selectionRef.current.id || type !== selectionRef.current.type) {
            // New selection - set it
            //console.log(`New selection: ${type} ${id}`);
            setSelection({ id, type, data: obj, marker });
        } else {
            // Same marker clicked - only update if data actually changed
            //console.log(`Same marker clicked: ${type} ${id}`);
            
            // For buses, compare relevant fields that might change
            if (type === 'bus') {
                const currentData = selectionRef.current.data;
                const newData = obj;
                
                // Check if any relevant bus data has changed
                const hasChanged = 
                    currentData.Bearing !== newData.Bearing ||
                    currentData.Latitude !== newData.Latitude ||
                    currentData.Longitude !== newData.Longitude ||
                    currentData.Speed !== newData.Speed ||
                    currentData.RouteId !== newData.RouteId ||
                    currentData.TripId !== newData.TripId;
                
                if (hasChanged) {
                    //console.log(`Bus data changed, updating selection`);
                    setSelection(prev => ({ ...prev, data: obj }));
                } else {
                    //console.log(`Bus data unchanged, ignoring click`);
                }
                // If no relevant data changed, do nothing (prevent unnecessary re-renders)
            } else if (type === 'stop') {
                // For stops, data rarely changes, so we don't update on re-click
                // This prevents the popup from unnecessarily reopening
                // Only update if there are actual changes to stop data (very rare)
                const currentData = selectionRef.current.data;
                const newData = obj;
                
                const hasChanged = 
                    currentData.name !== newData.name ||
                    currentData.routes?.join(',') !== newData.routes?.join(',');
                
                if (hasChanged) {
                    //console.log(`Stop data changed, updating selection`);
                    setSelection(prev => ({ ...prev, data: obj }));
                } else {
                    //console.log(`Stop data unchanged, ignoring click`);
                }
            }
        }
    }, []);

    // Update selection data when marker data changes (for real-time updates)
    const updateSelectionData = useCallback((id, newData) => {
        setSelection(prev => {
            if (prev && prev.id === id) {
                // Only update if the data reference is different
                if (prev.data !== newData) {
                    return { ...prev, data: newData };
                }
                return prev;
            }
            return prev;
        });
    }, []);

    // Run when selection changes. For ANY - stops, buses
    useEffect(() => {
        if (selection) {
            // Reset previous highlight
            if (highlightedMarkerRef.current) {
                const prev = highlightedMarkerRef.current;
                const pinCreator = pinCreatorsRef.current[prev.type];
                if (pinCreator) {
                    if (prev.type === 'bus') {
                        const rotation = prev.data.Bearing || 0;
                        prev.marker.content = pinCreator('gray', rotation, false);
                    } else {
                        prev.marker.content = pinCreator();
                    }
                }
            }

            // Highlight new marker
            const pinCreator = pinCreatorsRef.current[selection.type];
            if (pinCreator && selection.marker) {
                if (selection.type === 'bus') {
                    const rotation = selection.data.Bearing || 0;
                    selection.marker.content = pinCreator('#ff0000', rotation, true);
                } else {
                    selection.marker.content = pinCreator('#ff0000', true);
                }
                highlightedMarkerRef.current = selection;
            }

            //console.log('Selection updated:', selection);
        } else {
            // Clear previous highlight when selection is cleared
            if (highlightedMarkerRef.current) {
                const prev = highlightedMarkerRef.current;
                const pinCreator = pinCreatorsRef.current[prev.type];
                if (pinCreator) {
                    if (prev.type === 'bus') {
                        const rotation = prev.data.Bearing || 0;
                        prev.marker.content = pinCreator('gray', rotation, false);
                    } else {
                        prev.marker.content = pinCreator();
                    }
                }
                highlightedMarkerRef.current = null;
            }

            //console.log('Selection cleared');
        }
    }, [selection]);

    // If this component exists, the map is guaranteed to exist, no need for validation here
    return (
        <>
            {/* Stop markers is just the markers, with listeners */}
            <StopMarkers
                map={map}
                routeIds={routeIds.map(val => val.replace(/^0+/, ''))}
                stopClicked={handleMarkerClicked}
                registerPinCreator={(type, fn) => { pinCreatorsRef.current[type] = fn; }}
            />
            <BusMarkers2
                map={map}
                routeIds={routeIds}
                busClicked={handleMarkerClicked}
                registerPinCreator={(type, fn) => { pinCreatorsRef.current[type] = fn; }}
                updateSelectionData={updateSelectionData}
            />
            <PopupManager selection={selection} clearSelection={() => setSelection(null)} />
        </>
    );
}

export default SelectionsManager;