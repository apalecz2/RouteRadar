import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCachedData } from './dataCache';

function createMemoryStorage() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear(),
    };
}

const ROUTES = [{ id: '1', name: 'Route 1' }];
const STOPS = [{ stop_id: 'A', name: 'Stop A' }];

beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
    globalThis.fetch = vi.fn((url) => {
        const body = url.includes('routes.json') ? ROUTES : STOPS;
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(body),
        });
    });
});

describe('getCachedData', () => {
    it('fetches and caches routes/stops when nothing is cached yet', async () => {
        const { routes, stops } = await getCachedData();

        expect(routes).toEqual(ROUTES);
        expect(stops).toEqual(STOPS);
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
        expect(globalThis.localStorage.getItem('dataCacheVersion')).toBe('v1');
    });

    it('serves from localStorage on a second call without refetching', async () => {
        await getCachedData();
        globalThis.fetch.mockClear();

        const { routes, stops } = await getCachedData();

        expect(routes).toEqual(ROUTES);
        expect(stops).toEqual(STOPS);
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('refetches when the cached version is stale', async () => {
        await getCachedData();
        globalThis.localStorage.setItem('dataCacheVersion', 'v0-old');
        globalThis.fetch.mockClear();

        await getCachedData();

        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('refetches when cached JSON is corrupt', async () => {
        globalThis.localStorage.setItem('dataCacheVersion', 'v1');
        globalThis.localStorage.setItem('routesData', 'not valid json');
        globalThis.localStorage.setItem('stopsData', JSON.stringify(STOPS));

        const { routes, stops } = await getCachedData();

        expect(routes).toEqual(ROUTES);
        expect(stops).toEqual(STOPS);
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws if a fetch fails', async () => {
        globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false }));

        await expect(getCachedData()).rejects.toThrow('Failed to fetch');
    });
});
