


// Now all markers on the map are managed from here. This includes popups. All selections stem from here

// There is one state for the currently selected object. The object has the id, and type
// If this changes, the popup needs to be updated, and ping animations etc

import { useState, useEffect, useRef } from 'react';


import StopMarkers from './StopMarkers';




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
    const handleMarkerClicked = (obj, type, marker) => {

        const id = obj.stop_id || obj.VehicleId || obj.id;

        if (!selectionRef.current || id !== selectionRef.current.id || type !== selectionRef.current.type) {
            console.log('new pin clicked');
            setSelection({ id, type, data: obj, marker })
        }


        //console.log(selection)
        /*
        if (type == 'stop') {
            setSelection(obj)
        } else if (type == 'bus') {
            setSelection(obj)
        }
            */
    }

    // Run when selection changes. For ANY - stops, buses
    useEffect(() => {

        if (!selection) return;

        // Reset previous highlight
        if (highlightedMarkerRef.current) {
            const prev = highlightedMarkerRef.current;
            const pinCreator = pinCreatorsRef.current[prev.type];
            if (pinCreator) {
                prev.marker.content = pinCreator(); // default pin
            }
        }

        // Highlight new marker
        const pinCreator = pinCreatorsRef.current[selection.type];
        if (pinCreator && selection.marker) {
            selection.marker.content = pinCreator('#ff0000', true); // red with ping
            highlightedMarkerRef.current = selection;
        }

        if (selection) {
            console.log('Selection updated:', selection);
        }


        // Update popup




    }, [selection])





    // If this component exists, the map is guaranteed to exist, no need for validation here
    return (
        <>
            {/* Stop markers is just the markers, with listeners */}
            <StopMarkers map={map} routeIds={routeIds.map(val => val.replace(/^0+/, ''))} stopClicked={handleMarkerClicked} registerPinCreator={(type, fn) => { pinCreatorsRef.current[type] = fn; }} />





        </>

    );




}


export default SelectionsManager;