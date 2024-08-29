import requests
from bs4 import BeautifulSoup
import datetime

def get_cancellations():
    url = 'https://www.parkrun.com/cancellations/'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 403:
        print("Access denied: 403 Forbidden")
        return []
    
    soup = BeautifulSoup(response.text, 'html.parser')
    cancellations = []

    # Example of parsing logic: you might need to adjust these selectors
    for event in soup.find_all('div', class_='event-cancellation'):
        name = event.find('h2').text.strip()
        date = event.find('p', class_='event-date').text.strip()

        event_date = datetime.datetime.strptime(date, "%d %B %Y")
        today = datetime.datetime.today()
        
        # Debug: Print each event's name and date
        print(f"Found event: {name}, Date: {date}")

        # Filter for upcoming weekend cancellations
        if event_date.weekday() == 5:  # Saturday
            if event_date >= today and event_date < today + datetime.timedelta(days=7):
                cancellations.append(f"{name} - {date}")

    return cancellations

def save_cancellations_to_file(cancellations, filename='cancellations.txt'):
    with open(filename, 'w') as f:
        for cancellation in cancellations:
            f.write(f"{cancellation}\n")

if __name__ == "__main__":
    cancellations = get_cancellations()
    print(f"Cancellations found: {cancellations}")  # Debug: Print cancellations found
    save_cancellations_to_file(cancellations)
