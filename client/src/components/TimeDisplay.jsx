import { useEffect, useState } from 'react';

const TimeDisplay = () => {
    const [time, setTime] = useState(() => new Date());
    const [animateKey, setAnimateKey] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
            setAnimateKey(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formattedTime = time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    // For making the background red slightly
    // bg-[rgba(255,0,0,0.2)] dark:bg-[rgba(255,0,0,0.2)]

    return (
        <div
            className={`
                fixed top-6 right-6 z-[1000]
                px-4 py-3
                rounded-xl
                bg-white
                border border-gray-200 shadow-xl
                text-black
                font-medium text-lg
                flex items-center gap-2
                transition-all duration-300
            `}
        >
            
            <span key={animateKey} className="font-mono animate-fade-pulse block tracking-wide">
                {formattedTime}
            </span>
        </div>
    );
};

export default TimeDisplay;
