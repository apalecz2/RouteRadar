// Utility to cache and fetch routes.json and stops.json using localStorage

const ROUTES_KEY = 'routesData';
const STOPS_KEY = 'stopsData';
const CACHE_VERSION = 'v1'; // Increment this to invalidate cache
const VERSION_KEY = 'dataCacheVersion';

async function fetchAndCache(url, key) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const data = await response.json();
  localStorage.setItem(key, JSON.stringify(data));
  return data;
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

  if (needsUpdate) {
    routes = await fetchAndCache('/routes.json', ROUTES_KEY);
    stops = await fetchAndCache('/stops.json', STOPS_KEY);
    localStorage.setItem(VERSION_KEY, CACHE_VERSION);
  }

  return { routes, stops };
} 