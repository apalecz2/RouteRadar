// Utility to cache and fetch routes.json and stops.json using localStorage.
//
// Two independent invalidation mechanisms:
//   - CACHE_VERSION: a hard, blocking invalidation. Bump it when the *shape* of
//     the JSON changes so every client refetches before rendering.
//   - MAX_AGE_MS: content freshness. The static GTFS data (routes/stops
//     geometry) is regenerated and committed by
//     .github/workflows/update-gtfs.yml a few times a year at seasonal service
//     changes. Cached data older than this is served immediately but
//     revalidated in the background, so a returning visitor picks up the newer
//     feed on their next load instead of being pinned to a stale copy forever.

const ROUTES_KEY = 'routesData';
const STOPS_KEY = 'stopsData';
const VERSION_KEY = 'dataCacheVersion';
const TIMESTAMP_KEY = 'dataCacheTimestamp';
const CACHE_VERSION = 'v1'; // Bump to force a blocking refetch for all clients.
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

async function fetchAndCache(url, key) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const data = await response.json();
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

async function fetchAll() {
  const routes = await fetchAndCache('/routes.json', ROUTES_KEY);
  const stops = await fetchAndCache('/stops.json', STOPS_KEY);
  localStorage.setItem(VERSION_KEY, CACHE_VERSION);
  localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
  return { routes, stops };
}

// Dedupes concurrent background refreshes (getCachedData is called from several
// components). On failure the stale cache is left in place and retried next call.
let revalidating = null;

function revalidateInBackground() {
  if (revalidating) return;
  revalidating = fetchAll()
    .catch(() => {})
    .finally(() => { revalidating = null; });
}

export async function getCachedData() {
  const version = localStorage.getItem(VERSION_KEY);
  let routes = null;
  let stops = null;
  let needsUpdate = version !== CACHE_VERSION;

  if (!needsUpdate) {
    try {
      routes = JSON.parse(localStorage.getItem(ROUTES_KEY));
      stops = JSON.parse(localStorage.getItem(STOPS_KEY));
      if (!routes || !stops) needsUpdate = true;
    } catch {
      needsUpdate = true;
    }
  }

  // No usable cache (first visit, corrupt, or a version bump): fetch and block.
  if (needsUpdate) {
    return fetchAll();
  }

  // Usable cache. If it has gone stale, serve it now but kick off a background
  // refresh so the next load gets fresh data. A missing timestamp (clients
  // cached before this field existed) counts as stale, so they revalidate too.
  const timestamp = Number(localStorage.getItem(TIMESTAMP_KEY)) || 0;
  if (Date.now() - timestamp > MAX_AGE_MS) {
    revalidateInBackground();
  }

  return { routes, stops };
}
