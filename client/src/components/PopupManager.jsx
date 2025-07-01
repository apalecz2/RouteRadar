import { useEffect, useState, useRef } from 'react';
import BottomPopup from './BottomPopup';
import BusPopupContent from './BusPopupContent';
import StopPopupContent from './StopPopupContent';

const PopupManager = ({ selection, clearSelection }) => {
    const [activePopup, setActivePopup] = useState(null);
    const [popupQueue, setPopupQueue] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const lastPopupRef = useRef(null);

    // When selection changes, queue or show popup
    useEffect(() => {
        if (selection) {
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
            setIsClosing(true);
        }
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
            {lastPopupRef.current?.type === 'stop' && (
                <StopPopupContent stop={lastPopupRef.current.data} arrivals={lastPopupRef.current.arrivals} />
            )}
            {lastPopupRef.current?.type === 'bus' && (
                <BusPopupContent bus={lastPopupRef.current.data} />
            )}
        </BottomPopup>
    );
};

export default PopupManager;
