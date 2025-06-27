import { useState, useEffect } from "react";

const BottomPopup = ({ open, onClose, children }) => {

    const [visible, setVisible] = useState(false);
    const [show, setShow] = useState(false);
    const [content, setContent] = useState(children);

    useEffect(() => {
        if (open) {
            setShow(true);
            setTimeout(() => setVisible(true), 10);
        } else {
            setVisible(false);
            setTimeout(() => {
                setShow(false);
                onClose();
            }, 300);
        }
    }, [open]);

    useEffect(() => {
        // Optional: fade out/in content
        setContent(null);
        const timeout = setTimeout(() => {
            setContent(children);
        }, 150); // half of duration for smoother transition
        return () => clearTimeout(timeout);
    }, [children]);

    if (!show) return null;

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
            transition-all duration-300
            ${visible ? 'animate-slide-up' : 'animate-slide-down'}
        `}
        >
            <div className="relative z-10">
                <button
                    onClick={() => {
                        setVisible(false);
                        setTimeout(() => {
                            setShow(false);
                            onClose();
                        }, 300);
                    }}
                    className="absolute top-2 right-4 text-black text-xl"
                >
                    ×
                </button>
                {children}
            </div>
        </div>
    );

}

export default BottomPopup