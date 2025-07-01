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



    // Handles a marker clicked, obj: the content, type: string - stop, bus..., marker: reference to actual map marker
    const handleMarkerClicked = useCallback((obj, type, marker) => {
        const id = obj.stop_id || obj.VehicleId || obj.id;

        // Use the ref here to prevent needing 'selection' in the dependency array
        if (!selectionRef.current || id !== selectionRef.current.id || type !== selectionRef.current.type) {
            setSelection({ id, type, data: obj, marker });
        }
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

            console.log('Selection updated:', selection);
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

            console.log('Selection cleared');
        }
    }, [selection]);


    /*
    const btnClk = () => {
        console.log('set null')
        setSelection(null);
    }
        */


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
            />
            <PopupManager selection={selection} clearSelection={() => setSelection(null)} />
            {/*<button className="absolute top-5 left-20 z-50 bg-white p-2 rounded shadow" onClick={btnClk}>Click</button>*/}
        </>

    );

}


export default SelectionsManager;