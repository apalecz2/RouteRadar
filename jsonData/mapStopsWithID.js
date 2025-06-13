const fs = require('fs');
const path = require('path');

// Input files
const geojsonPath = './January 2025 LT Stops.json';
const gtfsStopsPath = './stops.txt';
const outputPath = './parsed-stops.json';

// Parse GTFS stops.txt and build a map of stop_code => stop_id
function parseGTFSStops(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  const header = lines.shift().split(',');

  const stopCodeIndex = header.indexOf('stop_code');
  const stopIdIndex = header.indexOf('stop_id');

  const map = new Map();
  for (const line of lines) {
    const parts = line.split(',');
    const stopCode = parts[stopCodeIndex];
    const stopId = parts[stopIdIndex];
    map.set(parseInt(stopCode, 10), stopId);
  }
  return map;
}

try {
  const rawData = fs.readFileSync(geojsonPath, 'utf8');
  const jsonData = JSON.parse(rawData);

  const stopCodeToIdMap = parseGTFSStops(gtfsStopsPath);

  const cleaned = jsonData.features.map(feature => {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;

    const id = props.Stop_ID;
    const stop_id = stopCodeToIdMap.get(id) || null;

    const rawName = props.Stop_Name;
    const name = rawName.replace(/\s+-\s+#\d+$/, '').trim();

    const lat = +coords[1].toFixed(6);
    const lng = +coords[0].toFixed(6);
    const coordinates = [lat, lng];

    const rawRoutes = props.Routes.split(',').map(r => r.trim()).filter(Boolean);
    const routeBranch = props.Route_Bran.trim();

    const routeNums = new Set(rawRoutes.map(r => r.replace(/[^0-9]/g, '')));
    if (routeBranch !== '-' && /^Rt\d+[A-Z]?$/.test(routeBranch)) {
      const match = routeBranch.match(/^Rt(\d+)([A-Z]?)$/);
      if (match) {
        const [_, num, suffix] = match;
        if (routeNums.has(num)) routeNums.delete(num);
        routeNums.add(num + suffix);
      }
    }

    const routes = Array.from(routeNums);

    return { id, stop_id, name, coordinates, routes };
  });

  fs.writeFileSync(outputPath, JSON.stringify(cleaned, null, 2), 'utf8');
  console.log(`Parsed stops written to ${outputPath}`);
} catch (err) {
  console.error('Error:', err);
}
