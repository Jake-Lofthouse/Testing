import requests
import json

def fetch_parkrun_data():

    api_key = 'YOUR_GOOGLE_MAPS_API_KEY'
    url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query=parkrun&key={api_key}"
    
    response = requests.get(url)
    results = response.json().get('results', [])

    parkruns = []
    for result in results:
        parkrun = {
            "coords": [result['geometry']['location']['lat'], result['geometry']['location']['lng']],
            "name": result['name'],
            "description": result.get('formatted_address', '')
        }
        parkruns.append(parkrun)
    
    return parkruns

def update_parkruns():
    parkrun_data = fetch_parkrun_data()
    with open('parkruns.json', 'w') as f:
        json.dump({"parkruns": parkrun_data}, f, indent=4)

if __name__ == "__main__":
    update_parkruns()
