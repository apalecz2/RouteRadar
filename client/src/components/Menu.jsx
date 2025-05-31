import { useState } from "react";

const Menu = () => {
    
    const [showMenu, setShowMenu] = useState(false);


    return (
        <div>
            <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="absolute top-4 right-4 z-20 bg-white p-2 rounded shadow-md hover:bg-gray-100"
            >
                ☰ Menu
            </button>
            {/* Overlay Menu */}
            {showMenu && (
                <div className="absolute top-16 right-4 z-20 bg-white p-4 rounded shadow-lg w-64">
                    <h2 className="text-lg font-semibold mb-2">Map Options</h2>
                    <ul className="space-y-2">
                        <li><button className="text-blue-600 hover:underline">Toggle Markers</button></li>
                        <li><button className="text-blue-600 hover:underline">Change Style</button></li>
                        <li><button className="text-blue-600 hover:underline">Recenter</button></li>
                    </ul>
                </div>
            )}
        </div>
    )


}

export default Menu;