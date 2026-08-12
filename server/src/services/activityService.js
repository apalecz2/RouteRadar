// Tracks how many GraphQL subscriptions are currently open, so the polling loop
// can idle while nobody is watching.
//
// Every byte the poller pulls from LTC is billed as outbound bandwidth (Render
// bills service-initiated traffic, including response bodies), and the service
// is kept awake around the clock by the /keepalive endpoint. Polling with zero
// subscribers is therefore pure cost with no one to serve, which is what this
// exists to stop.
//
// Counting subscriptions rather than WebSocket connections is deliberate: a
// socket that is connected but has not subscribed to anything needs no data.

let activeSubscriptions = 0;

// Resolvers for callers parked in waitForSubscription(). An array (rather than a
// single slot) keeps this correct if more than one caller ever waits.
let waiters = [];

function releaseWaiters() {
    const pending = waiters;
    waiters = [];
    for (const resolve of pending) resolve();
}

export function addSubscription() {
    activeSubscriptions++;
    // Only the 0 -> 1 transition needs to wake the poller; later ones are noise.
    if (activeSubscriptions === 1) releaseWaiters();
}

export function removeSubscription() {
    if (activeSubscriptions > 0) activeSubscriptions--;
}

export function hasSubscriptions() {
    return activeSubscriptions > 0;
}

export function getSubscriptionCount() {
    return activeSubscriptions;
}

// Resolves immediately when someone is already subscribed, otherwise on the next
// subscription — or when wakeIdleWaiters() is called during shutdown, so a parked
// poller does not keep the process from exiting.
export function waitForSubscription() {
    if (activeSubscriptions > 0) return Promise.resolve();
    return new Promise((resolve) => { waiters.push(resolve); });
}

export const wakeIdleWaiters = releaseWaiters;

// Test-only: reset module state between cases.
export function resetSubscriptionsForTest() {
    activeSubscriptions = 0;
    waiters = [];
}
