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
        fixed top-6 right-[5%] md:right-6 z-40
        px-4 py-2
        rounded-2xl
        bg-white/10 dark:bg-white/5
        backdrop-blur-2xl
        border border-black/30 dark:border-black/30 shadow-xl
        text-black dark:text-black
        font-mono text-base md:text-base
      `}
        >
            <span key={animateKey} className="animate-fade-pulse block">
                {formattedTime}
            </span>
        </div>
    );
};

export default TimeDisplay;
