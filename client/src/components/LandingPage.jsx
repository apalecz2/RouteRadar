import { useNavigate } from 'react-router-dom';
import { getRouteColor } from '../utils/getRouteColor';

// Same glyph used by the on-map bus markers (see Pins/BusPin.jsx), duplicated here
// since that component builds its DOM imperatively and can't drive an SVG <animateMotion>.
const BUS_ICON_PATH = "M320-200v20q0 25-17.5 42.5T260-120q-25 0-42.5-17.5T200-180v-62q-18-20-29-44.5T160-340v-380q0-83 77-121.5T480-880q172 0 246 37t74 123v380q0 29-11 53.5T760-242v62q0 25-17.5 42.5T700-120q-25 0-42.5-17.5T640-180v-20H320Zm162-560h224-448 224Zm158 280H240h480-80Zm-400-80h480v-120H240v120Zm100 240q25 0 42.5-17.5T400-380q0-25-17.5-42.5T340-440q-25 0-42.5 17.5T280-380q0 25 17.5 42.5T340-320Zm280 0q25 0 42.5-17.5T680-380q0-25-17.5-42.5T620-440q-25 0-42.5 17.5T560-380q0 25 17.5 42.5T620-320ZM258-760h448q-15-17-64.5-28.5T482-800q-107 0-156.5 12.5T258-760Zm62 480h320q33 0 56.5-23.5T720-360v-120H240v120q0 33 23.5 56.5T320-280Z";

// The road buses travel along; also used to place the stop dots below.
const ROUTE_PATH_D = "M0,70 C60,20 140,20 200,70 C260,120 340,120 400,70 C460,20 540,20 600,70";
const STOPS = [0, 200, 400, 600].map((x) => ({ x, y: 70 }));

// Colors pulled from the same palette as the in-app route/bus markers, for continuity.
const BUSES = [
    { color: getRouteColor(4), duration: 7, begin: 0, withPing: true },
    { color: getRouteColor(8), duration: 9, begin: -3 },
    { color: getRouteColor(1), duration: 11, begin: -6 },
];

const RouteHeroAnimation = () => (
    <svg
        viewBox="-15 0 630 140"
        className="w-full h-auto"
        role="img"
        aria-label="Animated illustration of buses traveling along a route"
    >
        <defs>
            <radialGradient id="hero-glow" cx="50%" cy="45%" r="75%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#ffffff" />
            </radialGradient>
        </defs>

        <rect x="-15" y="0" width="630" height="140" fill="url(#hero-glow)" />

        <path id="hero-route" d={ROUTE_PATH_D} fill="none" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 9">
            <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.6s" repeatCount="indefinite" />
        </path>

        {STOPS.map((stop, i) => (
            <circle
                key={i}
                cx={stop.x}
                cy={stop.y}
                r="4.5"
                fill="#fff"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 1px 1px rgba(15, 23, 42, 0.12))' }}
            />
        ))}

        {BUSES.map((bus, i) => (
            // Grouped under one <g> so position, scale and opacity share the same clock:
            // buses shrink and fade out right as they hit the end of the path, then grow
            // and fade back in at the start, masking the animateMotion loop reset.
            // A soft drop-shadow (rather than the map pins' hard black outline) keeps this
            // in step with the page's shadow-based, borderless-on-white visual language.
            <g key={i} style={{ filter: 'drop-shadow(0 2px 3px rgba(15, 23, 42, 0.22))' }}>
                {bus.withPing && (
                    <circle r="9" fill={bus.color} opacity="0.45">
                        <animate attributeName="r" values="9;21;9" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.45;0;0.45" dur="2s" repeatCount="indefinite" />
                    </circle>
                )}
                <circle r="9" fill={bus.color} stroke="#fff" strokeWidth="2" />
                <svg x="-6" y="-6" width="12" height="12" viewBox="0 -960 960 960">
                    <path d={BUS_ICON_PATH} fill="#fff" />
                </svg>

                <animateMotion dur={`${bus.duration}s`} begin={`${bus.begin}s`} repeatCount="indefinite">
                    <mpath href="#hero-route" />
                </animateMotion>
                <animateTransform
                    attributeName="transform"
                    type="scale"
                    additive="sum"
                    dur={`${bus.duration}s`}
                    begin={`${bus.begin}s`}
                    repeatCount="indefinite"
                    keyTimes="0;0.08;0.92;1"
                    values="0.3;1;1;0.3"
                />
                <animate
                    attributeName="opacity"
                    dur={`${bus.duration}s`}
                    begin={`${bus.begin}s`}
                    repeatCount="indefinite"
                    keyTimes="0;0.08;0.92;1"
                    values="0;1;1;0"
                />
            </g>
        ))}
    </svg>
);

const LandingPage = () => {
    const navigate = useNavigate();

    const onStart = () => {
        navigate('/map');
    };

    return (
        <div className="h-dvh overflow-hidden sm:h-auto sm:min-h-screen sm:overflow-visible bg-slate-50 text-slate-900 flex flex-col p-3 sm:p-6">
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="max-w-3xl w-full text-center space-y-3 sm:space-y-8">
                    <div className="space-y-1 sm:space-y-3">
                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-slate-900">
                            RouteRadar
                        </h1>
                        <p className="text-sm sm:text-lg md:text-xl text-slate-600">
                            Real-time bus tracking and route visualization
                        </p>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-2 sm:p-4 overflow-hidden">
                        <RouteHeroAnimation />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-4 text-left">
                        <div className="bg-white p-3 sm:p-5 rounded-lg border border-slate-200">
                            <h3 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">Never Miss Your Bus</h3>
                            <p className="text-slate-600 text-xs sm:text-sm">Real-time positions for every bus, so you know exactly when to head out.</p>
                        </div>
                        <div className="bg-white p-3 sm:p-5 rounded-lg border border-slate-200">
                            <h3 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">Built for Your Commute</h3>
                            <p className="text-slate-600 text-xs sm:text-sm">Filter to just your routes. Skip the clutter and schedule digging.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center pt-1 sm:pt-2">
                        <button
                            onClick={onStart}
                            className="launch-btn relative w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold shadow-sm flex items-center justify-center gap-2"
                        >
                            Launch App
                            <span className="launch-btn-arrow text-xl">→</span>
                        </button>
                        <a
                            href="https://github.com/apalecz2/RouteRadar"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-md font-semibold transition-colors border border-slate-200 flex items-center justify-center gap-2"
                        >
                            View Code
                        </a>
                    </div>
                </div>
            </div>

            <footer className="text-center text-slate-500 text-xs sm:text-sm pt-2 pb-1 sm:py-4 shrink-0">
                Built by Aiden Paleczny
            </footer>
        </div>
    );
};

export default LandingPage;
