import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();

    const onStart = () => {
        navigate('/map');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
                 <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
                 <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-3xl"></div>
            </div>

            <div className="z-10 max-w-2xl w-full text-center space-y-8">
                <div className="space-y-2">
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 pb-2">
                        RouteRadar
                    </h1>
                    <p className="text-xl text-slate-300 font-light">
                        Real-time bus tracking and route visualization
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 text-left py-8">
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
                        <div className="text-blue-400 text-2xl mb-2"></div>
                        <h3 className="font-semibold text-lg mb-1">Live Tracking</h3>
                        <p className="text-slate-400 text-sm">Watch buses move in real-time across the city map.</p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
                        <div className="text-emerald-400 text-2xl mb-2"></div>
                        <h3 className="font-semibold text-lg mb-1">Route Selection</h3>
                        <p className="text-slate-400 text-sm">Filter and view specific bus routes instantly.</p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
                        <div className="text-purple-400 text-2xl mb-2"></div>
                        <h3 className="font-semibold text-lg mb-1">Portfolio Project</h3>
                        <p className="text-slate-400 text-sm">A demonstration of React, Maps, and Real-time data.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button 
                        onClick={onStart}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 flex items-center gap-2"
                    >
                        Launch App
                        <span className="text-xl">→</span>
                    </button>
                    <a 
                        href="https://github.com/apalecz2/BusWebApp2" 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-semibold transition-all flex items-center gap-2"
                    >
                        View Code
                    </a>
                </div>
            </div>

            <footer className="mt-8 sm:mt-12 text-slate-500 text-sm">
                Built by Aiden Paleczny
            </footer>
        </div>
    );
};

export default LandingPage;
