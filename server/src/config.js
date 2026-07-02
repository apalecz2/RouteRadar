export const VEHICLE_URL = 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.json';
export const TRIP_UPDATE_URL = 'http://gtfs.ltconline.ca/TripUpdate/TripUpdates.json';
export const UPDATE_PERIOD_SEC = 30;
export const PORT = process.env.PORT || 4000;

// Comma-separated list of allowed origins for CORS, e.g. "https://example.com,https://foo.com".
// Defaults to the deployed frontend plus local dev ports if not set.
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : ['https://transit.aidenpaleczny.com', 'http://localhost:5173'];
