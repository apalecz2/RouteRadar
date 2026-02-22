import { useState, useEffect } from 'react';
import { connectionStatus } from '../../utils/connectionStatus';

const ConnectionContent = () => {
    const [status, setStatus] = useState(connectionStatus.get());

    useEffect(() => {
        // Subscribe to connection status updates
        const unsubscribe = connectionStatus.subscribe(setStatus);
        return () => unsubscribe();
    }, []);

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


    return (
        <div className="space-y-6">
            <h3 className="font-semibold text-xl text-gray-800">Connection Status</h3>

            <div className={`p-4 rounded-xl border ${status.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className={`font-bold ${getStatusColor()}`}>{getStatusText()}</span>
                </div>

            </div>

            <div className="space-y-2">
                <h3 className="font-medium text-black">Details</h3>
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm border border-blue-100 mb-2">
                    <p>The app automatically manages connections and attempts to reconnect when offline. No action is usually required.</p>
                </div>
                <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-mono">{status.connected ? 'Online' : 'Offline'}</span>
                    </div>
                    {!status.connected && (
                        <div className="flex justify-between text-orange-600">
                            <span>Retries:</span>
                            <span className="font-mono">{status.retryCount}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>Last Update:</span>
                        <span className="font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
            
            {/*
            {!status.connected && (
                <button
                    onClick={() => subscriptionManager.resubscribeAll()}
                    className="w-full py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg"
                >
                    Force Reconnect
                </button>
            )}
            */}
        </div>
    );
};

export default ConnectionContent;