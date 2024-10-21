const fs = require('fs');
const fetch = require('node-fetch');

// Read parkrun events JSON
let rawData = fs.readFileSync('parkruns.json');
let parkruns = JSON.parse(rawData);

// Function to fetch geographical features for given coordinates
async function fetchGeographicalFeatures(coords) {
    const [lon, lat] = coords;
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const data = await response.json();
    return data;
}

// Pre-process and add terrain tags
async function processEvents() {
    const events = parkruns.events.features.slice(0, 5); // Limit to first 5 events for testing
    const eventsWithTags = [];

    for (const event of events) {
        const coords = event.geometry.coordinates;
        const features = await fetchGeographicalFeatures(coords);
        const tags = [];

        // Use the synonym dictionary for matching geographical features
        if (features.address.natural || features.address.leisure) {
            tags.push(features.address.natural || features.address.leisure);
        }

        eventsWithTags.push({
            id: event.id,
            eventname: event.properties.eventname,
            coordinates: coords,
            tags: tags
        });
    }

    // Save the new JSON file with tags
    fs.writeFileSync('parkruns_with_terrain.json', JSON.stringify({ events: eventsWithTags }, null, 2));
    console.log("Generated parkruns_with_terrain.json");
}

// Run the script
processEvents();
