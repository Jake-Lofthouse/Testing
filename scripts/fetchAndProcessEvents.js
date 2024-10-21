const fs = require('fs');
const fetch = require('node-fetch');

async function fetchEvents() {
    const response = await fetch("https://raw.githubusercontent.com/ALD-Models/Testing/refs/heads/main/parkruns.json");
    const data = await response.json();
    return data.events.features;
}

function processEvents(events) {
    return events.map(event => {
        // Add your custom tagging logic here
        event.properties.tags = []; // Example tag property
        // Example: Add tags based on event location
        if (event.properties.EventLocation.toLowerCase().includes('park')) {
            event.properties.tags.push('park');
        }
        // Add more logic as needed
        return event;
    });
}

async function main() {
    try {
        const events = await fetchEvents();
        const processedEvents = processEvents(events);

        // Write processed events to JSON file
        fs.writeFileSync('./path/to/your/processedEvents.json', JSON.stringify({ features: processedEvents }, null, 2));
        console.log('Processed events saved successfully.');
    } catch (error) {
        console.error("Error processing events:", error);
    }
}

main();
