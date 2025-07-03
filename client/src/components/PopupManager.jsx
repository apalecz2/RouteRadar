import { useEffect, useState, useRef, useCallback } from 'react';
import { gql, useApolloClient } from '@apollo/client';
import BottomPopup from './BottomPopup';
import BusPopupContent from './BusPopupContent';
import StopPopupContent from './StopPopupContent';
import RoutePopupContent from './RoutePopupContent';

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
    // Use the id from the selection object directly, which is already computed in SelectionsManager
    return `${sel.type}:${sel.id}`;
}

const PopupManager = ({ selection, clearSelection }) => {
    const [activePopup, setActivePopup] = useState(null);
    const [popupQueue, setPopupQueue] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const lastPopupRef = useRef(null);
    const client = useApolloClient();
    const currentSubscriptionRef = useRef(null);
    const [selectionKey, setSelectionKey] = useState(null);
    // Cache for latest arrivals per stop
    const latestArrivalsRef = useRef({});
    // Track the currently subscribed stop to prevent unnecessary cleanup
    const currentSubscribedStopRef = useRef(null);

    // Clean up subscription when component unmounts or selection changes
    const cleanupSubscription = (reason = 'unknown') => {
        if (currentSubscriptionRef.current) {
            //console.log(`Cleaning up subscription - Reason: ${reason}`);
            currentSubscriptionRef.current.unsubscribe();
            currentSubscriptionRef.current = null;
            currentSubscribedStopRef.current = null;
        }
    };

    // Subscribe to stop updates
    const subscribeToStopUpdates = useCallback((stopId) => {
        if (!stopId || !client) return;

        // Check if we're already subscribed to this stop
        if (currentSubscribedStopRef.current === stopId) {
            //console.log(`Already subscribed to stop ${stopId}, skipping subscription`);
            return;
        }

        //console.log(`Subscribing to stop updates for: ${stopId}`);
        
        // Clean up any existing subscription first
        cleanupSubscription('new subscription for different stop');

        // Track the current subscribed stop
        currentSubscribedStopRef.current = stopId;

        // Create a flag to track if we've received initial data
        let hasReceivedInitialData = false;
        let timeoutId = null;
        let retryCount = 0;
        const maxRetries = 3;

        const createSubscription = () => {
            // Check if we have cached data and if it's fresh (less than 30 seconds old)
            const cachedArrivals = latestArrivalsRef.current[stopId];
            const now = Math.floor(Date.now() / 1000);
            const isCachedDataFresh = cachedArrivals && cachedArrivals.length > 0 && 
                cachedArrivals.some(arrival => (now - arrival.timestamp) < 30);
            
            if (isCachedDataFresh) {
                //console.log(`Using fresh cached data for stop ${stopId}`);
                hasReceivedInitialData = true;
            } else if (cachedArrivals) {
                //console.log(`Cached data is stale for stop ${stopId}, will wait for fresh data`);
                // Clear stale cached data
                latestArrivalsRef.current[stopId] = [];
            }

            const observable = client.subscribe({
                query: STOP_UPDATES_SUB,
                variables: { stopId },
            });

            const subscription = observable.subscribe({
                next({ data }) {
                    //console.log(`Subscription received data for stop ${stopId}:`, data);
                    const arrivals = data?.stopUpdates;
                    if (arrivals && Array.isArray(arrivals)) {
                        //console.log(`Received ${arrivals.length} arrivals for stop ${stopId}`);
                        
                        // Clear the timeout since we received data
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                        }
                        
                        // Reset retry count on successful data
                        retryCount = 0;
                        
                        // Update cache with latest data
                        latestArrivalsRef.current[stopId] = arrivals;
                        
                        // Mark that we've received data
                        hasReceivedInitialData = true;
                        
                        // Update active popup if it's for this stop
                        setActivePopup(prev => {
                            if (prev?.type === 'stop' && prev.data?.stop_id === stopId) {
                                //console.log(`Updating active popup for stop ${stopId} with ${arrivals.length} arrivals`);
                                const updatedPopup = { ...prev, arrivals };
                                lastPopupRef.current = updatedPopup;
                                return updatedPopup;
                            }
                            return prev;
                        });
                        
                        // Also update queued popup if it's for this stop
                        setPopupQueue(prev => {
                            if (prev?.type === 'stop' && prev.data?.stop_id === stopId) {
                                //console.log(`Updating queued popup for stop ${stopId} with ${arrivals.length} arrivals`);
                                const updatedPopup = { ...prev, arrivals };
                                return updatedPopup;
                            }
                            return prev;
                        });
                    } else {
                        console.log(`Received invalid data for stop ${stopId}:`, data);
                    }
                },
                error(error) {
                    console.error(`Error in stop subscription for ${stopId}:`, error);
                    console.error('Error details:', {
                        message: error.message,
                        graphQLErrors: error.graphQLErrors,
                        networkError: error.networkError,
                        extraInfo: error.extraInfo
                    });
                    
                    // Clean up failed subscription
                    if (timeoutId) clearTimeout(timeoutId);
                    
                    // Try to retry if we haven't exceeded max retries
                    if (retryCount < maxRetries && currentSubscribedStopRef.current === stopId) {
                        retryCount++;
                        //console.log(`Retrying subscription for stop ${stopId} (attempt ${retryCount}/${maxRetries})`);
                        setTimeout(() => {
                            if (currentSubscribedStopRef.current === stopId) {
                                createSubscription();
                            }
                        }, 1000 * retryCount); // Exponential backoff
                    } else {
                        console.log(`Max retries exceeded for stop ${stopId}, giving up`);
                        cleanupSubscription('subscription error - max retries exceeded');
                    }
                },
                complete() {
                    //console.log(`Subscription completed for stop ${stopId}`);
                    if (timeoutId) clearTimeout(timeoutId);
                    cleanupSubscription('subscription completed');
                }
            });

            currentSubscriptionRef.current = subscription;
        };

        // Start the subscription
        createSubscription();

        // Set a timeout to mark as "no data" if we don't receive anything within 5 seconds
        timeoutId = setTimeout(() => {
            if (!hasReceivedInitialData) {
                //console.log(`No initial data received for stop ${stopId} within 5 seconds`);
                // Update popup to show "no data" state
                setActivePopup(prev => {
                    if (prev?.type === 'stop' && prev.data?.stop_id === stopId && !prev.arrivals?.length) {
                        const updatedPopup = { ...prev, arrivals: [] };
                        lastPopupRef.current = updatedPopup;
                        return updatedPopup;
                    }
                    return prev;
                });
                
                // Also update queued popup if it's for this stop
                setPopupQueue(prev => {
                    if (prev?.type === 'stop' && prev.data?.stop_id === stopId && !prev.arrivals?.length) {
                        const updatedPopup = { ...prev, arrivals: [] };
                        return updatedPopup;
                    }
                    return prev;
                });
            }
        }, 5000);
    }, [client]);

    // Only trigger popup animation if the selection identity changes
    useEffect(() => {
        
        const newKey = getSelectionKey(selection);
        if (newKey !== selectionKey) {
            // Selection identity changed - this is a new selection
            //console.log(`Popup: Selection identity changed from ${selectionKey} to ${newKey}`);
            setSelectionKey(newKey);
            
            if (selection) {
                if (selection.type === 'stop') {
                    const stopId = selection.data?.stop_id;
                    //console.log(`New stop selection: ${stopId}`);
                    
                    // Check if we have fresh cached data
                    const cachedArrivals = latestArrivalsRef.current[stopId];
                    const now = Math.floor(Date.now() / 1000);
                    const isCachedDataFresh = cachedArrivals && cachedArrivals.length > 0 && 
                        cachedArrivals.some(arrival => (now - arrival.timestamp) < 30);
                    
                    // Start subscription immediately (this will handle cleanup if needed)
                    subscribeToStopUpdates(stopId);
                    
                    // Use cached data only if it's fresh, otherwise start with empty array
                    const initialArrivals = isCachedDataFresh ? cachedArrivals : [];
                    const popupWithArrivals = { ...selection, arrivals: initialArrivals };
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
                    
                    // If we don't have fresh cached data, set a short timeout to check for immediate updates
                    if (!isCachedDataFresh) {
                        setTimeout(() => {
                            const freshArrivals = latestArrivalsRef.current[stopId];
                            if (freshArrivals && freshArrivals.length > 0) {
                                //console.log(`Immediate update: Found ${freshArrivals.length} fresh arrivals for stop ${stopId}`);
                                setActivePopup(prev => {
                                    if (prev?.type === 'stop' && prev.data?.stop_id === stopId) {
                                        const updatedPopup = { ...prev, arrivals: freshArrivals };
                                        lastPopupRef.current = updatedPopup;
                                        return updatedPopup;
                                    }
                                    return prev;
                                });
                            }
                        }, 100); // Check after 100ms for immediate data
                    }
                } else if (selection.type === 'route') {
                    // Route selection - clean up any stop subscription
                    cleanupSubscription('switching to route selection');
                    
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
                } else {
                    // Bus selection - clean up any stop subscription
                    cleanupSubscription('switching to bus selection');
                    
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
                // Selection cleared
                //console.log('Popup: Selection cleared');
                cleanupSubscription('selection cleared');
                setIsClosing(true);
            }
        } else if (selection && activePopup) {
            // Same selection identity but data might have changed
            // Only update the popup data in place, don't trigger animations
            //console.log(`Popup: Same selection ${newKey}, updating data in place`);
            setActivePopup(prev => {
                if (!prev) return prev;
                
                // For stops, preserve arrivals data
                if (selection.type === 'stop') {
                    const stopId = selection.data?.stop_id;
                    const cachedArrivals = latestArrivalsRef.current[stopId] || [];
                    const updatedPopup = { ...selection, arrivals: cachedArrivals };
                    lastPopupRef.current = updatedPopup;
                    return updatedPopup;
                } else if (selection.type === 'route') {
                    // For routes, just update with new data
                    lastPopupRef.current = selection;
                    return selection;
                } else {
                    // For buses, just update with new data
                    lastPopupRef.current = selection;
                    return selection;
                }
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
                    //console.log(`Queue transition: Setting active popup from queue`);
                    // Ensure the queued popup has the latest data
                    if (popupQueue.type === 'stop') {
                        const stopId = popupQueue.data?.stop_id;
                        const latestArrivals = latestArrivalsRef.current[stopId] || [];
                        const updatedPopup = { ...popupQueue, arrivals: latestArrivals };
                        //console.log(`Queue transition: Updated popup with ${latestArrivals.length} arrivals for stop ${stopId}`);
                        setActivePopup(updatedPopup);
                    } else if (popupQueue.type === 'route') {
                        setActivePopup(popupQueue);
                    } else {
                        setActivePopup(popupQueue);
                    }
                    setPopupQueue(null);
                } else {
                    lastPopupRef.current = null;
                }
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [isClosing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupSubscription('component unmount');
        };
    }, []);

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
            {activePopup?.type === 'route' && (
                <RoutePopupContent route={activePopup.data} />
            )}
        </BottomPopup>
    );
};

export default PopupManager;