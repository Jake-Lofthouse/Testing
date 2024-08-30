import json
import requests
from bs4 import BeautifulSoup

# Load the JSON file
with open('parkruns.json', 'r') as file:
    data = json.load(file)

countries = data['countries']
events = data['events']['features']

output = []

# Function to scrape additional information from the event page
def scrape_event_info(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')

    # Example scraping logic; needs to be adapted based on the actual page structure
    description = soup.find('div', {'class': 'c-event-description'}).text.strip()
    terrain = 'unknown'  # Default, until found
    
    # Logic to determine terrain type, e.g., by checking for keywords
    if 'beach' in description.lower():
        terrain = 'beach'
    elif 'hilly' in description.lower():
        terrain = 'hilly'
    elif 'trail' in description.lower():
        terrain = 'trail'
    elif 'path' in description.lower():
        terrain = 'path'
    
    return {
        'description': description,
        'terrain': terrain
    }

# Loop through each event and scrape the information
for event in events:
    country_code = event['properties']['countrycode']
    country_info = countries[str(country_code)]
    
    # Ensure the URL is complete and append /course
    event_url = f"https://{country_info['url']}/{event['properties']['eventname']}/course"
    event_info = scrape_event_info(event_url)
    
    event_data = {
        'eventname': event['properties']['eventname'],
        'EventLongName': event['properties']['EventLongName'],
        'EventLocation': event['properties']['EventLocation'],
        'url': event_url,
        'description': event_info['description'],
        'terrain': event_info['terrain'],
        'coordinates': event['geometry']['coordinates']
    }
    
    output.append(event_data)

# Save the output to a new JSON file
with open('parkrun_details.json', 'w') as outfile:
    json.dump(output, outfile, indent=4)
