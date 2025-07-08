import { useEffect, useState } from 'react';
import { connectionStatus } from '../utils/connectionStatus';
import subscriptionManager from '../utils/subscriptionManager';

export default function ConnectionMonitor() {
    const [status, setStatus] = useState(connectionStatus.get());

    useEffect(() => {
        const unsubscribe = connectionStatus.subscribe(setStatus);
        return unsubscribe;
    }, []);

    useEffect(() => {
        let interval;
        if (!status.connected && status.retryCount > 0) {
            console.log('[ConnectionMonitor] Will attempt resubscribe every 5s...');
            interval = setInterval(() => {
                console.log('[ConnectionMonitor] Attempting resubscribe...');
                subscriptionManager.resubscribeAll();
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [status.connected, status.retryCount]);

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1rem',
                right: '1rem',
                background: '#fff',
                border: '1px solid #ccc',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                zIndex: 9999,
            }}
        >
            <strong>Status:</strong>{' '}
            {status.connected ? (
                <span style={{ color: 'green' }}>🟢 Connected</span>
            ) : (
                <span style={{ color: 'red' }}>🔴 Disconnected</span>
            )}
            <br />
            <small>Retry Count: {status.retryCount}</small>
        </div>
    );
}
