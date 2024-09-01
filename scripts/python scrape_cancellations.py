import requests
from bs4 import BeautifulSoup
import datetime
import json

def get_this_weekend_range():
    today = datetime.datetime.now()
    # Find the next Saturday
    days_until_saturday = (5 - today.weekday()) % 7
    saturday = today + datetime.timedelta(days=days_until_saturday)
    # Find the next Sunday
    sunday = saturday + datetime.timedelta(days=1)
    return saturday.date(), sunday.date()

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

    # Get this weekend's date range
    this_weekend_start, this_weekend_end = get_this_weekend_range()

    # Find the section that contains the cancellation information
    section = soup.find('section', class_='clearfix')
    if section:
        # Find all <h2> tags to identify dates
        date_headers = section.find_all('h2')
        for header in date_headers:
            date_str = header.text.strip()
            try:
                # Extract the date from <h2> tags
                event_date = datetime.datetime.strptime(date_str, "%A, %B %d, %Y").date()
            except ValueError as e:
                print(f"Date format issue: {e}")
                continue
            
            # Check if the event_date falls within this weekend's range
            if this_weekend_start <= event_date <= this_weekend_end:
                # Find all <li> tags within the <ul> under this date header
                ul = header.find_next_sibling('ul')
                if ul:
                    for li in ul.find_all('li'):
                        link = li.find('a')
                        if link:
                            name = link.text.strip()
                            reason = li.text.replace(name, '').strip().strip(': ')
                            cancellations.append({
                                "name": name,
                                "reason": reason,
                                "date": event_date.strftime('%Y-%m-%d')
                            })

    return cancellations

def save_cancellations_to_file(cancellations, filename='cancellations.json'):
    with open(filename, 'w') as f:
        json.dump(cancellations, f, indent=4)

if __name__ == "__main__":
    cancellations = get_cancellations()
    print(f"Cancellations found: {cancellations}")  # Debug: Print cancellations found
    save_cancellations_to_file(cancellations)
