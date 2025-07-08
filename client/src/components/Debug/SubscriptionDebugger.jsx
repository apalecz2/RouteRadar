import { useState, useEffect } from 'react';
import subscriptionManager from '../../utils/subscriptionManager';
import subscriptionPersistence from '../utils/subscriptionPersistence';

const SubscriptionDebugger = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const updateSubscriptions = () => {
            setSubscriptions(subscriptionManager.getActiveSubscriptions());
        };

        // Update immediately
        updateSubscriptions();

        // Update every 2 seconds
        const interval = setInterval(updateSubscriptions, 2000);

        return () => clearInterval(interval);
    }, []);

    const handleResubscribeAll = () => {
        subscriptionManager.resubscribeAll();
        setSubscriptions(subscriptionManager.getActiveSubscriptions());
    };

    const handleClearAll = () => {
        subscriptionManager.clearAll();
        setSubscriptions([]);
    };

    const handleSaveState = () => {
        subscriptionPersistence.saveSubscriptionState();
    };

    const handleRestoreState = async () => {
        await subscriptionPersistence.restoreSubscriptions();
        setSubscriptions(subscriptionManager.getActiveSubscriptions());
    };

    const handleClearStoredState = () => {
        subscriptionPersistence.clearStoredState();
    };

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                style={{
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    padding: '8px 12px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                }}
            >
                Subscriptions ({subscriptionManager.getSubscriptionCount()})
            </button>
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                zIndex: 1000,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '16px',
                maxWidth: '400px',
                maxHeight: '500px',
                overflow: 'auto',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Active Subscriptions</h3>
                <button
                    onClick={() => setIsVisible(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '0',
                        width: '24px',
                        height: '24px'
                    }}
                >
                    ×
                </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <strong>Total: {subscriptionManager.getSubscriptionCount()}</strong>
            </div>

            {subscriptions.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No active subscriptions</p>
            ) : (
                <div>
                    {subscriptions.map((sub) => (
                        <div
                            key={sub.id}
                            style={{
                                padding: '8px',
                                marginBottom: '8px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px',
                                border: '1px solid #e9ecef'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                {sub.type === 'vehicle' ? '🚌' : '🚏'} {sub.type}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                ID: {sub.id}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Variables: {JSON.stringify(sub.variables)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Callbacks: {sub.callbackCount}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={handleResubscribeAll}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Resubscribe All
                </button>
                <button
                    onClick={handleSaveState}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Save State
                </button>
                <button
                    onClick={handleRestoreState}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Restore State
                </button>
                <button
                    onClick={handleClearAll}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Clear All
                </button>
                <button
                    onClick={handleClearStoredState}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Clear Stored
                </button>
            </div>
        </div>
    );
};

export default SubscriptionDebugger; 