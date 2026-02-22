const SidebarTab = ({ isActive, onClick, icon, label, alert }) => (
    <div className="relative group">
        <button
            onClick={onClick}
            className={`
                w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-200
                ${isActive
                    ? 'bg-black text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'
                }
                ${alert ? 'ring-2 ring-red-500 ring-offset-2' : ''}
            `}
            title={label}
        >
            {icon}
        </button>
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {label}
        </div>
    </div>
);

export default SidebarTab;