// Reads route info from the output json file from converting the downloaded files from ltc open data, to json on https://mapshaper.org
// outputs minified json file with only route id and coordinates

const fs = require('fs');

const inputPath = './2024 Spring LT Routes.json';
const outputPath = './parsed-routesSEGMENTS.json';

try {
    const rawData = fs.readFileSync(inputPath, 'utf8');
    const jsonData = JSON.parse(rawData);

    const simplified = jsonData.features.map(feature => {
        const id = feature.properties.Name;
        const coords = feature.geometry.coordinates;

        // Preserve segments and round each coordinate
        const segments = coords.map(segment =>
            segment.map(([lng, lat]) => [
                +lat.toFixed(6),
                +lng.toFixed(6)
            ])
        );

        return { id, segments };
    });

    fs.writeFileSync(outputPath, JSON.stringify(simplified), 'utf8');
    console.log(`Written to ${outputPath}`);
} catch (err) {
    console.error('Error:', err);
}
