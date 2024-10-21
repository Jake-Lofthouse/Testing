self.onmessage = async function(event) {
    const { coordinatesBatch, translatedWord } = event.data;

    // Function to fetch geographical features using Overpass API
    async function fetchGeographicalFeaturesBatch(coordinatesBatch) {
        const coordQuery = coordinatesBatch
            .map(coords => `node(around:1000,${coords[1]},${coords[0]});`)
            .join('');
    
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(${coordQuery});out;`;
    
        try {
            const response = await fetch(overpassUrl);
            const data = await response.json();
            return data.elements.map(element => element.tags);
        } catch (error) {
            console.error("Error fetching Overpass data", error);
            return [];
        }
    }

    const featuresBatch = await fetchGeographicalFeaturesBatch(coordinatesBatch);
    
    // Return results to the main thread
    self.postMessage({ featuresBatch });
};
