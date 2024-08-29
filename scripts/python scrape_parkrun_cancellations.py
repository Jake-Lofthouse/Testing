# scrape_parkrun_cancellations.py

import requests
from bs4 import BeautifulSoup
import datetime

def get_cancellations():
    # Set the URL for the Parkrun cancellations page
    url = 'https://www.parkrun.com/cancellations/'

    # Send a GET request to the URL
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')

    # Find the cancellation list
    cancellations = []

    # Parse the page to find cancellation entries
    for event in soup.find_all('div', class_='event-cancellation'):
        name = event.find('h2').text.strip()
        date = event.find('p', class_='event-date').text.strip()
        
        # Filter by upcoming weekend
        event_date = datetime.datetime.strptime(date, "%d %B %Y")
        today = datetime.datetime.today()
        if event_date.weekday() == 5:  # Saturday
            # Only include if event is within the upcoming weekend
            if event_date >= today and event_date < today + datetime.timedelta(days=7):
                cancellations.append(f"{name} - {date}")

    return cancellations

def save_cancellations_to_file(cancellations, filename='cancellations.txt'):
    with open(filename, 'w') as f:
        for cancellation in cancellations:
            f.write(f"{cancellation}\n")

if __name__ == "__main__":
    cancellations = get_cancellations()
    save_cancellations_to_file(cancellations)
