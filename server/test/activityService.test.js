import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    addSubscription,
    removeSubscription,
    hasSubscriptions,
    getSubscriptionCount,
    waitForSubscription,
    wakeIdleWaiters,
    resetSubscriptionsForTest,
} from '../src/services/activityService.js';

// Resolves to 'waited' only if the promise settles; 'timeout' means it is still
// parked, which is the state the poller sits in while idle.
function settledWithin(promise, ms = 50) {
    return Promise.race([
        promise.then(() => 'waited'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), ms)),
    ]);
}

beforeEach(() => {
    resetSubscriptionsForTest();
});

test('starts with no subscriptions, so the poller idles', () => {
    assert.equal(hasSubscriptions(), false);
    assert.equal(getSubscriptionCount(), 0);
});

test('counts subscriptions up and down symmetrically', () => {
    addSubscription();
    addSubscription();
    assert.equal(getSubscriptionCount(), 2);
    assert.equal(hasSubscriptions(), true);

    removeSubscription();
    assert.equal(getSubscriptionCount(), 1);
    assert.equal(hasSubscriptions(), true);

    removeSubscription();
    assert.equal(getSubscriptionCount(), 0);
    assert.equal(hasSubscriptions(), false);
});

test('never counts below zero on unbalanced teardown', () => {
    removeSubscription();
    removeSubscription();
    assert.equal(getSubscriptionCount(), 0);

    // A later subscription must still wake the poller.
    addSubscription();
    assert.equal(hasSubscriptions(), true);
});

test('waitForSubscription resolves immediately when someone is already subscribed', async () => {
    addSubscription();
    assert.equal(await settledWithin(waitForSubscription()), 'waited');
});

test('waitForSubscription parks while nobody is subscribed', async () => {
    assert.equal(await settledWithin(waitForSubscription()), 'timeout');
});

test('a new subscription wakes a parked waiter', async () => {
    const pending = waitForSubscription();
    addSubscription();
    assert.equal(await settledWithin(pending), 'waited');
});

test('wakes every parked waiter, not just the first', async () => {
    const first = waitForSubscription();
    const second = waitForSubscription();

    addSubscription();

    assert.equal(await settledWithin(first), 'waited');
    assert.equal(await settledWithin(second), 'waited');
});

test('wakeIdleWaiters releases a parked waiter without any subscription', async () => {
    // The shutdown path: a parked poller must observe the flag and exit.
    const pending = waitForSubscription();
    wakeIdleWaiters();

    assert.equal(await settledWithin(pending), 'waited');
    assert.equal(hasSubscriptions(), false);
});

test('parks again after the last subscription goes away', async () => {
    addSubscription();
    removeSubscription();

    assert.equal(await settledWithin(waitForSubscription()), 'timeout');
});
