import React from 'react';

const HelpContent = () => (
    <div className="space-y-8 pb-10">
        {/* Header */}
        <div className="border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">explore</span>
                About RouteRadar
            </h2>
            <p className="text-gray-500 text-sm mt-1">Real-time transit tracking for London, Ontario.</p>
        </div>

        {/* Quick Start Guide */}
        <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">school</span>
                Quick Start
            </h3>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 space-y-4">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">1</div>
                        <div>
                            <h4 className="font-semibold text-gray-900">Select Routes</h4>
                            <p className="text-sm text-gray-600">Use the <span className="font-bold">Routes</span> tab to choose which bus lines you want to see.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">2</div>
                        <div>
                            <h4 className="font-semibold text-gray-900">View Arrivals</h4>
                            <p className="text-sm text-gray-600">Click any <span className="font-bold">Stop</span> on the map to see upcoming arrival times.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">3</div>
                        <div>
                            <h4 className="font-semibold text-gray-900">Track Buses</h4>
                            <p className="text-sm text-gray-600">Watch buses move in real-time. Click a bus for route info and occupancy.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Legend */}
        <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">info</span>
                Map Legend
            </h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600">directions_bus</span>
                    <span className="text-sm font-medium text-gray-700">Active Bus</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full border-2 border-slate-500 bg-white"></span>
                    <span className="text-sm font-medium text-gray-700">Bus Stop</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Live Data</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-gray-400">wifi_off</span>
                    <span className="text-sm font-medium text-gray-700">Offline</span>
                </div>
            </div>
        </section>

        {/* Contact / Project Info */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold mb-1">Developer Info</h3>
                    <p className="text-slate-300 text-sm">Built by Aiden Paleczny</p>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="material-symbols-outlined text-white">code</span>
                </div>
            </div>

            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                This implies a software engineering portfolio project, leveraging modern web technologies to provide accurate transit data for London.
            </p>

            <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-200 bg-white/5 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-lg">web</span>
                    <a href="https://aidenpaleczny.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">aidenpaleczny.com</a>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200 bg-white/5 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-lg">mail</span>
                    <a href="mailto:aiden.paleczny@gmail.com" className="hover:text-white transition-colors">aiden.paleczny@gmail.com</a>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200 bg-white/5 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-lg">layers</span>
                    <span>React, Vite, GraphQL, Node.js</span>
                </div>

            </div>
        </section>

        <div className="text-center">
            <p className="text-xs text-gray-400">Version 1.0.0</p>
        </div>
    </div>
);

export default HelpContent;