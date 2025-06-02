// stop data from same source as routes, output relevant stop data to json

const fs = require('fs');

const inputPath = './January 2025 LT Stops.json';
const outputPath = './parsed-stops.json';

try {
  const rawData = fs.readFileSync(inputPath, 'utf8');
  const jsonData = JSON.parse(rawData);

  const cleaned = jsonData.features.map(feature => {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;

    const id = props.Stop_ID;

    // Remove trailing " - #ID" pattern from the stop name
    const rawName = props.Stop_Name;
    const name = rawName.replace(/\s+-\s+#\d+$/, '').trim();

    const lat = +coords[1].toFixed(6);
    const lng = +coords[0].toFixed(6);
    const coordinates = [lat, lng];

    const rawRoutes = props.Routes.split(',').map(r => r.trim()).filter(Boolean); // ['Rt2', 'Rt3']
    const routeBranch = props.Route_Bran.trim(); // e.g., 'Rt2B'

    // Cleaned base route numbers
    const routeNums = new Set(
      rawRoutes.map(r => r.replace(/[^0-9]/g, ''))
    );

    // Add or replace with branched route
    if (routeBranch !== '-' && /^Rt\d+[A-Z]?$/.test(routeBranch)) {
      const match = routeBranch.match(/^Rt(\d+)([A-Z]?)$/);
      if (match) {
        const [_, num, suffix] = match;
        if (routeNums.has(num)) {
          routeNums.delete(num); // Replace base route
          routeNums.add(num + suffix);
        } else {
          routeNums.add(num + suffix);
        }
      }
    }

    const routes = Array.from(routeNums);

    return { id, name, coordinates, routes };
  });

  fs.writeFileSync(outputPath, JSON.stringify(cleaned), 'utf8');
  console.log(`Parsed stops written to ${outputPath}`);
} catch (err) {
  console.error('Error:', err);
}