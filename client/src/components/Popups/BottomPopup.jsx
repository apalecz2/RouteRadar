import { useState, useEffect } from "react";

// Close button
const CloseButton = ({ onClick }) => (
    <button
        onClick={onClick}
        className={`
        fixed top-6 right-6 md:right-6 z-50
        p-2 md:p-2
        rounded-2xl
        bg-white/10 dark:bg-white/5
        backdrop-blur-2xl
        ${false ? '' : 'border border-black/30 dark:border-black/30 shadow-xl'}
        hover:bg-white/50
        flex items-center justify-center
        h-12 w-12
      `}
        aria-label="Toggle Menu"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#000000"
            className={`
          transition-transform duration-500 ease-in-out
        `}
        >
            <path d={"M480-424 284-228q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 11 28t-11 28L536-480l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-424Z"}
            />
        </svg>
    </button>
);

const BottomPopup = ({ open, popupType, onClose, isClosing, triggerClose, children }) => {
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentContent, setCurrentContent] = useState(null);
    const [lastPopupType, setLastPopupType] = useState(null);

    // Make sure css animations sum to this
    const animationDuration = 300;

    useEffect(() => {
        if (open) {
            const isNewPopup = popupType !== lastPopupType;

            setShouldRender(true);

            if (isNewPopup || !currentContent) {
                // Animate only when switching to a different popup
                setIsAnimating(false);
                const timeoutId = setTimeout(() => {
                    setCurrentContent(children);
                    setIsAnimating(true);
                    setLastPopupType(popupType);
                }, currentContent ? animationDuration : 10);
                return () => clearTimeout(timeoutId);
            } else {
                // Same popup ID — update content silently (no animation)
                setCurrentContent(children);
            }
        } else {
            // Closing popup
            setIsAnimating(false);
            const timeoutId = setTimeout(() => {
                setShouldRender(false);
                setCurrentContent(null);
                setLastPopupType(null);
                onClose();
            }, animationDuration);
            return () => clearTimeout(timeoutId);
        }
    }, [open, popupType]);

    // This effect ensures live updates update the popup content
    useEffect(() => {
        if (open && popupType === lastPopupType) {
            setCurrentContent(children);
        }
    }, [children]); // Only runs if content changes for same popup

    if (!shouldRender) return null;

    return (
        <div
            className={`
        fixed bottom-[2.5rem] left-1/2 
        w-[90%] md:w-[550px] max-w-[95%] p-6 z-50
        rounded-2xl md:rounded-3xl
        bg-white/10 dark:bg-white/5 backdrop-blur-2xl
        border border-white/30 dark:border-white/15 shadow-2xl
        before:content-[''] before:absolute before:inset-0
        before:rounded-2xl md:before:rounded-3xl
        before:bg-gradient-to-br before:from-white/40 before:to-white/0
        before:pointer-events-none
        transition-all duration-300 transform
        ${open ? 'animate-slide-up' : isClosing ? 'animate-slide-down' : ''}
    `}
            style={{
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
            }}
        >
            <div className="relative z-10 text-left">
                <CloseButton onClick={triggerClose} />
                {currentContent}
            </div>
        </div>
    );
};

export default BottomPopup