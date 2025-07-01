import { useEffect, useState, useRef } from 'react';
import { gql, useApolloClient } from '@apollo/client';
import BottomPopup from './BottomPopup';
import BusPopupContent from './BusPopupContent';
import StopPopupContent from './StopPopupContent';

const STOP_UPDATES_SUB = gql`
    subscription($stopId: String!) {
        stopUpdates(stopId: $stopId) {
            stopId
            routeId
            tripId
            arrivalTime
            delaySeconds
            timestamp
        }
    }
`;

function getSelectionKey(sel) {
    if (!sel) return null;
    return `${sel.type}:${sel.data?.stop_id || sel.data?.VehicleId || sel.id}`;
}

const PopupManager = ({ selection, clearSelection }) => {
    const [activePopup, setActivePopup] = useState(null);
    const [popupQueue, setPopupQueue] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const lastPopupRef = useRef(null);
    const client = useApolloClient();
    const subscriptionsRef = useRef({});
    const [selectionKey, setSelectionKey] = useState(null);
    // Cache for latest arrivals per stop
    const latestArrivalsRef = useRef({});

    // Only trigger popup animation if the selection identity changes
    useEffect(() => {
        
        console.log('selection changed in popup manager')
        
        
        const newKey = getSelectionKey(selection);
        if (newKey !== selectionKey) {
            setSelectionKey(newKey);
            if (selection) {
                // If it's a stop, try to get cached arrivals
                if (selection.type === 'stop') {
                    const stopId = selection.data?.stop_id;
                    const cachedArrivals = latestArrivalsRef.current[stopId] || [];
                    const popupWithArrivals = { ...selection, arrivals: cachedArrivals };
                    lastPopupRef.current = popupWithArrivals;
                    setActivePopup(curr => {
                        if (curr) {
                            setPopupQueue(popupWithArrivals);
                            setIsClosing(true);
                            return curr;
                        } else {
                            return popupWithArrivals;
                        }
                    });
                } else {
                    lastPopupRef.current = selection;
                    setActivePopup(curr => {
                        if (curr) {
                            setPopupQueue(selection);
                            setIsClosing(true);
                            return curr;
                        } else {
                            return selection;
                        }
                    });
                }
            } else {
                setIsClosing(true);
            }
        } else if (selection && activePopup) {
            // If the selection is the same, but data changed, update the popup data in place
            setActivePopup(prev => {
                if (!prev) return prev;
                // Always update with the latest selection data
                lastPopupRef.current = selection;
                return selection;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selection]);

    // Handle close animation and queue transition
    useEffect(() => {
        if (isClosing) {
            const timeout = setTimeout(() => {
                setActivePopup(null);
                setIsClosing(false);
                if (popupQueue) {
                    setActivePopup(popupQueue);
                    setPopupQueue(null);
                } else {
                    lastPopupRef.current = null;
                }
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [isClosing]);

    // Subscribe to real-time updates for the selected stop (only if stop id changes)
    const stopId = activePopup?.type === 'stop' ? activePopup.data?.stop_id : null;
    useEffect(() => {
        // Clean up existing subscriptions
        Object.values(subscriptionsRef.current).forEach(sub => sub.unsubscribe());
        subscriptionsRef.current = {};

        if (!stopId || !client) return;

        const observable = client.subscribe({
            query: STOP_UPDATES_SUB,
            variables: { stopId },
        });

        const subscription = observable.subscribe({
            next({ data }) {
                const arrivals = data?.stopUpdates;
                if (arrivals) {
                    // Update cache
                    latestArrivalsRef.current[stopId] = arrivals;
                    setActivePopup(prev => {
                        if (prev?.type === 'stop' && prev.data.stop_id === stopId) {
                            const updatedPopup = { ...prev, arrivals };
                            lastPopupRef.current = updatedPopup;
                            return updatedPopup;
                        }
                        return prev;
                    });
                }
            },
            error(error) {
                console.error(`Error in stop subscription for ${stopId}:`, error);
            }
        });

        subscriptionsRef.current[`stop_${stopId}`] = subscription;

        // Cleanup function
        return () => {
            Object.values(subscriptionsRef.current).forEach(sub => sub.unsubscribe());
            subscriptionsRef.current = {};
        };
    }, [stopId, client]);

    const popupIdentity = activePopup
        ? `${activePopup.type}:${activePopup.data?.stop_id || activePopup.data?.VehicleId}`
        : null;

    return (
        <BottomPopup
            open={!isClosing && !!activePopup}
            popupType={popupIdentity}
            onClose={() => {}}
            isClosing={isClosing}
            triggerClose={clearSelection}
        >
            {activePopup?.type === 'stop' && (
                <StopPopupContent stop={activePopup.data} arrivals={activePopup.arrivals} />
            )}
            {activePopup?.type === 'bus' && (
                <BusPopupContent bus={activePopup.data} />
            )}
        </BottomPopup>
    );
};

export default PopupManager;
