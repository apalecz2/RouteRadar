import React, { useEffect, useState, useRef, useCallback } from 'react';
import subscriptionManager from '../../utils/subscriptionManager';
import BusPopupContent from '../Popups/BusPopupContent';
import StopPopupContent from '../Popups/StopPopupContent';
import RoutePopupContent from '../Popups/RoutePopupContent';

const SelectionDetails = ({ selection }) => {
    const [activePopup, setActivePopup] = useState(null);
    const currentSubscriptionIdRef = useRef(null);
    // Cache for latest arrivals per stop
    const latestArrivalsRef = useRef({});
    // Track the currently subscribed stop to prevent unnecessary cleanup
    const currentSubscribedStopRef = useRef(null);

    // Clean up subscription when component unmounts or selection changes
    const cleanupSubscription = useCallback((reason = 'unknown') => {
        if (currentSubscriptionIdRef.current) {
            subscriptionManager.unsubscribeCompletely(currentSubscriptionIdRef.current);
            currentSubscriptionIdRef.current = null;
            currentSubscribedStopRef.current = null;
        }
    }, []);

    // Subscribe to stop updates
    const subscribeToStopUpdates = useCallback((stopId, force = false) => {
        if (!stopId) return;

        // Skip if already subscribed and not forcing
        if (!force && currentSubscribedStopRef.current === stopId) {
             // Even if already subscribed, ensure we update the activePopup if it's stale
             // This handles the case where we clicked away and back to the same stop quickly
             if (latestArrivalsRef.current[stopId]) {
                 setActivePopup(prev => {
                     // Only update if we are still looking at this stop
                     if (prev?.type === 'stop' && prev.data?.stop_id === stopId) {
                         return { ...prev, arrivals: latestArrivalsRef.current[stopId] };
                     }
                     return prev;
                 });
             }
            return;
        }

        // Clean up any existing subscription first
        cleanupSubscription(force ? 'forced resubscription' : 'new subscription for different stop');

        // Track the current subscribed stop
        currentSubscribedStopRef.current = stopId;

        const createSubscription = () => {
            // Capture the current selection data needed for fallback
            // This ensures the callback has access to the relevant data even if props are stale
            // We use a REF here or direct access if possible, but inside useCallback we need to be careful with closures.
            // Using `selection` directly inside `createSubscription` (which is inside `useCallback` dependent on `selection`) is safe.
            
            const subscriptionId = subscriptionManager.subscribeToStop(stopId, {
                onNext: ({ data }) => {
                    //console.log('Received stop updates:', data); 
                    const arrivals = data?.stopUpdates;
                    if (!Array.isArray(arrivals)) return;

                    // arrivals is now an array of StopArrival
                    latestArrivalsRef.current[stopId] = arrivals;

                    // Refresh active popup if it matches this stop
                    setActivePopup(prev => {
                        // Check if we have a previous state that matches the stop
                        if (prev?.type === 'stop' && prev.data?.stop_id === stopId) {
                             return { ...prev, arrivals };
                        }
                        
                        // If no previous state (or different state), but the *current selection* (from prop) matches the data
                        // NOTE: using `selection` directly from closure here relies on `subscribeToStopUpdates` being recreated when `selection` changes.
                        if ((!prev || prev.type !== 'stop' || prev.data?.stop_id !== stopId) && selection?.type === 'stop' && selection.data?.stop_id === stopId) {
                            return {
                                type: 'stop',
                                data: selection.data,
                                arrivals
                            };
                        }

                        return prev;
                    });
                },
                onError: (err) => console.error('Subscription error:', err),
            });
            currentSubscriptionIdRef.current = subscriptionId;
        };

        createSubscription();
    }, [cleanupSubscription, selection]);

    // Effect to handle selection changes
    useEffect(() => {
        if (selection) {
            if (selection.type === 'stop') {
                const stopId = selection.data.stop_id;
                
                // Optimistic update from cache
                const cachedArrivals = latestArrivalsRef.current[stopId] || [];
                
                setActivePopup({
                    type: 'stop',
                    data: selection.data,
                    arrivals: cachedArrivals
                });
                
                subscribeToStopUpdates(stopId);
            } else {
                 if (currentSubscriptionIdRef.current) {
                     cleanupSubscription('switched to non-stop selection');
                 }
                 
                 setActivePopup({
                     type: selection.type,
                     data: selection.data
                 });
            }
        } else {
            // Selection cleared
            cleanupSubscription('selection cleared');
            setActivePopup(null);
        }
    }, [selection, subscribeToStopUpdates, cleanupSubscription]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupSubscription('component unmount');
        };
    }, [cleanupSubscription]);

    if (!activePopup) return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <span className="material-symbols-outlined text-4xl mb-2">info</span>
            <p>Select an item on the map to view details</p>
        </div>
    );

    return (
        <div className="h-full">
            {activePopup.type === 'stop' && (
                <StopPopupContent stop={activePopup.data} arrivals={activePopup.arrivals} />
            )}
            {activePopup.type === 'bus' && (
                <BusPopupContent bus={activePopup.data} />
            )}
            {activePopup.type === 'route' && (
                <RoutePopupContent route={activePopup.data} selection={activePopup.data} />
            )}
        </div>
    );
};

export default SelectionDetails;
