import requests
from bs4 import BeautifulSoup
from html_table_extractor.extractor import Extractor
import json
import datetime
import os
import time

# Output file path
output_path = "_data/cancellations.json"
os.makedirs(os.path.dirname(output_path), exist_ok=True)

# Helper function
def same_week(date_string):
    d1 = datetime.datetime.strptime(date_string, '%Y-%m-%d')
    d2 = datetime.datetime.today()
    return d1.isocalendar()[1] == d2.isocalendar()[1]

# Request cancellations page with retry logic
URL = "https://wiki.parkrun.com/index.php/Cancellations/Global"
headers = {'User-Agent': 'Mozilla/5.0'}
for attempt in range(5):
    response = requests.get(URL, headers=headers, timeout=30)
    if response.status_code == 200:
        break
    time.sleep(10)
else:
    raise Exception(f"Failed to fetch data from {URL} after retries")

soup = BeautifulSoup(response.text, 'html.parser')
extractor = Extractor(soup)
extractor.parse()
table = extractor.return_list()

# Remove header/footer rows
if table:
    try:
        table.pop(0)  # header
        table.pop(-1)  # possible footer
    except IndexError:
        pass

# Extract and format cancellations
cancellations = []
for row in table:
    try:
        date, name, _, region, reason = [col.strip() for col in row[:5]]
    except (ValueError, IndexError):
        continue

    if same_week(date):
        cancellations.append({
            "name": name,
            "reason": reason,
            "date": date
        })

# Save as JSON
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(cancellations, f, indent=4, ensure_ascii=False)

print(f"{len(cancellations)} cancellations saved to {output_path}")
