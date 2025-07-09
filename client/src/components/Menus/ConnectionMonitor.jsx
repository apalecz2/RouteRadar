import { useEffect, useState, useRef } from 'react';
import { connectionStatus } from '../../utils/connectionStatus';
import subscriptionManager from '../../utils/subscriptionManager';
import { reconnectWebSocket } from '../../graph/apolloClient';
import Menu from './Menu';

const ICON_WARNING = (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
        <path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm69-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Zm0-100Z" />
    </svg>
);
const ICON_CHECK = (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
        <path d="m382-354 339-339q12-12 28-12t28 12q12 12 12 28.5T777-636L410-268q-12 12-28 12t-28-12L182-440q-12-12-11.5-28.5T183-497q12-12 28.5-12t28.5 12l142 143Z" />
    </svg>
);

const RECONNECTED_DISPLAY_MS = 2500;
const FADE_OUT_MS = 500;

const ConnectionStatusContent = ({ status }) => {
    const getStatusColor = () => {
        if (status.connected) return 'text-green-600';
        if (status.retryCount > 0) return 'text-orange-600';
        return 'text-red-600';
    };

    const getStatusText = () => {
        if (status.connected) return 'Connected';
        if (status.retryCount > 0) return 'Reconnecting...';
        return 'Disconnected';
    };

    const getStatusIcon = () => {
        if (status.connected) return '🟢';
        if (status.retryCount > 0) return '🟡';
        return '🔴';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-black/10 rounded-lg">
                <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon()}</span>
                    <div>
                        <div className={`font-semibold ${getStatusColor()}`}>
                            {getStatusText()}
                        </div>
                        <div className="text-sm text-gray-600">
                            Retry Count: {status.retryCount}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="font-medium text-black">Connection Details</h3>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={getStatusColor()}>{getStatusText()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Retry Attempts:</span>
                        <span className="text-black">{status.retryCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Last Update:</span>
                        <span className="text-black">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            {!status.connected && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <span className="text-red-600">⚠️</span>
                        <span className="text-sm text-red-800">
                            Connection lost. The app will attempt to reconnect automatically.
                        </span>
                    </div>
                </div>
            )}

        </div>
    );
};

export default function ConnectionMonitor() {
    const [status, setStatus] = useState(connectionStatus.get());
    const [show, setShow] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const [recentlyReconnected, setRecentlyReconnected] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const reconnectTimeout = useRef();
    const fadeTimeout = useRef();
    const prevConnected = useRef(status.connected);
    const prevRetryCount = useRef(status.retryCount);

    // Subscribe to connection status
    useEffect(() => {
        const unsubscribe = connectionStatus.subscribe((s) => setStatus(s));
        return unsubscribe;
    }, []);

    // Handle reconnection display logic
    useEffect(() => {
        // Detect transition from disconnected to connected with retryCount > 0
        if (
            status.connected &&
            (!prevConnected.current || prevRetryCount.current > 0)
        ) {
            setShow(true);
            setRecentlyReconnected(true);
            setFadeOut(false);
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
            reconnectTimeout.current = setTimeout(() => {
                setFadeOut(true);
                fadeTimeout.current = setTimeout(() => {
                    setShow(false);
                    setRecentlyReconnected(false);
                    setFadeOut(false);
                }, FADE_OUT_MS);
            }, RECONNECTED_DISPLAY_MS);
        } else if (!status.connected && status.retryCount > 0) {
            // Disconnected or reconnecting
            setShow(true);
            setRecentlyReconnected(false);
            setFadeOut(false);
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
        } else if (recentlyReconnected) {
            // If we are in the reconnected-persist state, do nothing (let the timeout handle hiding)
        } else {
            // Connected and not recently reconnected
            setShow(false);
            setRecentlyReconnected(false);
            setFadeOut(false);
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
        }
        prevConnected.current = status.connected;
        prevRetryCount.current = status.retryCount;
        // Cleanup on unmount
        return () => {
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
        };
    }, [status.connected, status.retryCount]);

    // Resubscribe logic (unchanged)
    useEffect(() => {
        let interval;
        if (!status.connected && status.retryCount > 0) {
            interval = setInterval(() => {
                subscriptionManager.resubscribeAll();
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [status.connected, status.retryCount]);

    // Don't show the button if not needed
    if (!show && status.connected && status.retryCount === 0) return null;

    let baseTailwind =
        'fixed top-22 left-8 md:left-12 md:top-26 z-70 flex items-center justify-center h-12 w-12 rounded-2xl border shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 pointer-events-auto transition-all duration-300';
    let bgTailwind = 'bg-white/10 border-black/30';
    let extra = '';
    let isClickable = false;

    if (!status.connected && status.retryCount > 0) {
        // Reconnecting (animate red/orange)
        extra = 'connection-btn-reconnecting';
        bgTailwind = 'border-[rgba(255,140,0,0.25)]';
        isClickable = true;
    } else if (!status.connected) {
        // Disconnected (red)
        extra = 'connection-btn-disconnected';
        bgTailwind = 'bg-[rgba(255,0,0,0.18)] border-[rgba(255,0,0,0.25)]';
        isClickable = true;
    } else if (recentlyReconnected) {
        // Reconnected (green, checkmark) - not clickable
        extra = 'connection-btn-reconnected';
        bgTailwind = 'bg-[rgba(0,200,100,0.18)] border-[rgba(0,200,100,0.25)]';
        isClickable = false;
    }
    if (fadeOut) extra += ' connection-fade-out';

    const ConnectionButtonContent = () => {
        let icon = ICON_WARNING;
        if (recentlyReconnected) {
            icon = ICON_CHECK;
        }
        return icon;
    };

    return (
        <Menu
            menuId="connection-menu"
            title="Connection Status"
            buttonContent={ConnectionButtonContent}
            buttonClassName={`${baseTailwind} ${bgTailwind} ${extra}`}
            buttonProps={{
                disabled: !isClickable,
                title: !status.connected && status.retryCount > 0
                    ? 'Reconnecting...'
                    : !status.connected
                        ? 'Disconnected'
                        : recentlyReconnected
                            ? 'Reconnected'
                            : '',
                "aria-label": "Connection status",
                tabIndex: isClickable ? 0 : -1,
                type: "button"
            }}
            isControlled={true}
            isOpen={menuOpen}
            onOpenChange={setMenuOpen}
        >
            <ConnectionStatusContent status={status} />
        </Menu>
    );
}
