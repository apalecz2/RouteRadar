import React, { useState, useEffect } from 'react';

const DisclaimerPopup = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasVisited = localStorage.getItem('hasVisitedMap');
        if (!hasVisited) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('hasVisitedMap', 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/35 backdrop-blur-sm"
                onClick={handleClose}
            />
            
            {/* Popup Content */}
            <div className={`
                relative
                w-full max-w-md
                p-6 md:p-8
                rounded-3xl
                bg-white/10 dark:bg-white/5
                backdrop-blur-2xl
                border border-black/30 dark:border-black/30
                shadow-2xl
                before:content-[''] before:absolute before:inset-0
                before:rounded-3xl before:bg-gradient-to-br
                before:from-white/40 before:to-white/0
                before:pointer-events-none
                transform transition-all duration-300 ease-out
                flex flex-col gap-4
            `}>
                <h2 className="relative z-10 text-2xl font-semibold text-black">
                    Important Note:
                </h2>
                
                <div className="relative z-10 text-black/80 leading-relaxed text-sm space-y-3">
                    <p>
                        Bus locations, occupancy percentages, and other tracking information usually update every 30 seconds from the London Transit Commission. The data can be delayed, imprecise, or contain errors.
                        This application displays the data, but can only provide accuracy to the extent that it's given from the LTC. 
                    </p>
                    <p className="italic text-xs text-black/60">
                        This application uses Open Data provided by the London Transit Commission (LTC) under their Open Data Terms of Use. 
                        The information is provided "as is", and this application is not endorsed by or officially connected to London Transit.
                    </p>
                </div>

                <button
                    onClick={handleClose}
                    className={`
                        mt-4
                        relative z-10
                        w-full py-3 px-6
                        rounded-2xl
                        bg-white/10 dark:bg-white/5
                        text-black font-semibold
                        border border-black/30 dark:border-black/30
                        backdrop-blur-2xl
                        shadow-xl
                        hover:bg-white/50
                        transition-colors duration-200
                    `}
                >
                    Understood
                </button>
            </div>
        </div>
    );
};

export default DisclaimerPopup;
