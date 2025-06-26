import React from "react";

const StopPopup = ({ stop, onClose }) => {
  if (!stop) return null;

  return (
    <div
      className={`
        fixed bottom-6
        left-1/2
        transform -translate-x-1/2
        w-[90%] md:w-[420px] max-w-[95%]
        p-6 z-50
        rounded-2xl md:rounded-3xl
        bg-white/10 dark:bg-white/5
        backdrop-blur-2xl
        border border-white/30 dark:border-white/15
        shadow-2xl
        before:content-[''] before:absolute before:inset-0
        before:rounded-2xl md:before:rounded-3xl
        before:bg-gradient-to-br before:from-white/40 before:to-white/0
        before:pointer-events-none
        transition-all duration-300
        animate-slide-up
      `}
    >
      <div className="relative z-10">
        <h2 className="text-lg font-semibold">{stop.name}</h2>
        <p className="text-sm text-gray-300">Stop ID: {stop.stop_id}</p>
        {stop.routes && (
          <p className="text-sm text-gray-400 mt-2">
            Routes: {stop.routes.join(", ")}
          </p>
        )}
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-white text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default StopPopup;
