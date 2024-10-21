function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processEvents() {
    const response = await fetch('https://raw.githubusercontent.com/ALD-Models/Testing/main/parkruns.json');
    const parkruns = await response.json();
    const events = parkruns.events.features.slice(0, 5); // Modify to process more events

    const eventsWithTags = [];

    for (const event of events) {
        const coords = event.geometry.coordinates;
        try {
            const features = await fetchGeographicalFeatures(coords);
            const tags = [];

            if (features.address.natural || features.address.leisure) {
                tags.push(features.address.natural || features.address.leisure);
            }

            eventsWithTags.push({
                id: event.id,
                eventname: event.properties.eventname,
                coordinates: coords,
                tags: tags
            });

            // Add a delay between requests (e.g., 1 second)
            await delay(10);
        } catch (error) {
            console.error(`Failed to process event ${event.properties.eventname}: ${error.message}`);
            // Optionally push the event without tags or skip it
            eventsWithTags.push({
                id: event.id,
                eventname: event.properties.eventname,
                coordinates: coords,
                tags: []
            });
        }
    }

    fs.writeFileSync('parkruns_with_terrain.json', JSON.stringify({ events: eventsWithTags }, null, 2));
    console.log('Generated parkruns_with_terrain.json');
}
