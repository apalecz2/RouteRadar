// LTC publishes each realtime feed both as native GTFS-Realtime protobuf (.pb)
// and as a verbose JSON rendering of the same data (.json). We use the protobuf:
// it carries identical content at a fraction of the size, and every byte the
// poller pulls is billed as outbound bandwidth (Render bills service-initiated
// traffic, response bodies included). Measured 2026-08-12:
//   VehiclePositions  95.9 KB json -> 14.3 KB pb
//   TripUpdates       22.5 MB json ->  2.9 MB pb   (the dominant cost)
export const VEHICLE_URL = 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.pb';
export const TRIP_UPDATE_URL = 'http://gtfs.ltconline.ca/TripUpdate/TripUpdates.pb';
export const UPDATE_PERIOD_SEC = 30;
export const PORT = process.env.PORT || 4000;

// Comma-separated list of allowed origins for CORS, e.g. "https://example.com,https://foo.com".
// Defaults to the deployed frontend plus local dev ports if not set.
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : ['https://transit.aidenpaleczny.com', 'http://localhost:5173'];
