# RouteRadar

RouteRadar is a real-time transit tracking application designed around publicly accessable raw transit data from the London Transit Commission (LTC). It visualizes live bus locations in London, Ontario on an interactive Google Map, providing users with up-to-the-minute updates on vehicle positions, routes, and arrival times.

This project demonstrates the integration of real-time data feeds (GTFS-Realtime) with a modern web stack, utilizing GraphQL Subscriptions for efficient, low-latency updates.

## Features

- **Real-Time Tracking:** Watch buses move live on the map as they report their positions.
- **Live Updates:** Uses GraphQL Subscriptions over WebSockets to push updates instantly to the client without manual refreshing.
- **Route Selection:** Filter the map to show specific bus routes of interest.
- **Stop Predictions:** View estimated arrival times for stops along a route.
- **Vehicle Details:** Access detailed information such as vehicle occupancy, bearing, and destination.
- **Responsive Design:** Optimized for both desktop and mobile viewing.

## Tech Stack

### Client
- **Framework:** [React](https://react.dev/) (bootstrapped with [Vite](https://vitejs.dev/))
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **State Management & Data Fetching:** [Apollo Client](https://www.apollographql.com/docs/react/)
- **Maps:** [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- **Routing:** [React Router](https://reactrouter.com/)

### Server
- **Runtime:** [Node.js](https://nodejs.org/)
- **Server Framework:** [Express](https://expressjs.com/)
- **API:** [GraphQL](https://graphql.org/) with `graphql-ws` for WebSocket subscriptions.
- **Data Source:** Polling service that fetches GTFS-Realtime data (Vehicle Positions & Trip Updates) from the LTC API.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (Node Package Manager)
- A Google Maps API Key

### Installation

Clone the repository:
```bash
git clone https://github.com/apalecz2/RouteRadar.git
cd RouteRadar
```

#### 1. Backend Setup

Navigate to the server directory:
```bash
cd server
```

Install dependencies:
```bash
npm install
```

Start the server:
```bash
npm start
```
The server will start on `http://localhost:4000` (or the port defined in `src/config.js`). It exposes a GraphQL endpoint at `/graphql`.

#### 2. Frontend Setup

Navigate to the client directory:
```bash
cd ../client
```

Install dependencies:
```bash
npm install
```

Create a `.env` file in the `client` directory.

Example `.env` for local development:
```env
VITE_BACKEND_URL=http://localhost:4000
VITE_BACKEND_WS_URL=ws://localhost:4000/graphql

VITE_GOOGLE_MAPS_API_KEY=your-key-here
VITE_MAP_ID=map-key-here
```

Start the development server:
```bash
npm run dev
```
Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## Architecture

The system consists of two main components:

1.  **Polling Server:** The backend repeatedly triggers the LTC GTFS-Realtime endpoints (`Vehicle/VehiclePositions.json` and `TripUpdate/TripUpdates.json`). It processes this data, mapping trip updates to vehicles, and caches the latest state.
2.  **GraphQL Subscription Server:** When the frontend subscribes to updates (e.g., for a specific route), the server pushes the latest cached data to the client via WebSockets whenever new data is polled.

## Deployment

The project is configured for deployment on [Render](https://render.com/). It sets up both the web service (frontend) and the backend service.

## Author

Built by [Aiden Paleczny](https://github.com/apalecz2).
