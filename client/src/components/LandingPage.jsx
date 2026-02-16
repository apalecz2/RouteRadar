import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();

    const onStart = () => {
        navigate('/map');
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="max-w-3xl w-full text-center space-y-5 sm:space-y-10">
                <div className="space-y-2 sm:space-y-3">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-slate-900">
                        RouteRadar
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl text-slate-600">
                        Real-time bus tracking and route visualization
                    </p>
                </div>

                <div className="flex flex-col gap-3 text-left py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-6">
                    <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200">
                        <h3 className="font-semibold text-base mb-1">Live Tracking</h3>
                        <p className="text-slate-600 text-sm">Watch buses move in real-time across the city map.</p>
                    </div>
                    <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200">
                        <h3 className="font-semibold text-base mb-1">Route Selection</h3>
                        <p className="text-slate-600 text-sm">Filter and view specific bus routes instantly.</p>
                    </div>
                    <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200">
                        <h3 className="font-semibold text-base mb-1">Portfolio Project</h3>
                        <p className="text-slate-600 text-sm">A demonstration of React, Maps, and Real-time data.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center">
                    <button 
                        onClick={onStart}
                        className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                        Launch App
                        <span className="text-xl">→</span>
                    </button>
                    <a 
                        href="https://github.com/apalecz2/BusWebApp2" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-md font-semibold transition-colors border border-slate-200 flex items-center justify-center gap-2"
                    >
                        View Code
                    </a>
                </div>
            </div>

            <footer className="mt-5 sm:mt-10 text-slate-500 text-sm">
                Built by Aiden Paleczny
            </footer>
        </div>
    );
};

export default LandingPage;
