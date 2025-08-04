import requests
from bs4 import BeautifulSoup
from html_table_extractor.extractor import Extractor
import json
import datetime
import time
import os

def now():
    return datetime.datetime.now()

def same_week(date_string):
    d1 = datetime.datetime.strptime(date_string, '%Y-%m-%d')
    d2 = datetime.datetime.today()
    return d1.isocalendar()[1] == d2.isocalendar()[1]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
}

print(now(), 'Getting cancellations data from parkrun wiki...')
url = 'https://wiki.parkrun.com/index.php/Cancellations/Global'

# Helper to check if we can use the response
def valid_response(r):
    return r.status_code in [200, 202] and len(r.text.strip()) > 0

response = requests.get(url, headers=headers, timeout=60)
if not valid_response(response):
    print(now(), f"Initial request failed ({response.status_code}), retrying...")
    time.sleep(10)
    for i in range(9):
        response = requests.get(url, headers=headers, timeout=60)
        if valid_response(response):
            print(now(), f"Retry succeeded on attempt {i+1} with status {response.status_code}")
            break
        time.sleep(5)
    else:
        raise Exception(f"Failed to fetch data from {url} after retries")

soup = BeautifulSoup(response.text, 'html.parser')
extractor = Extractor(soup)
extractor.parse()
table = extractor.return_list()

try:
    table.pop(0)
    table.pop(-1)
except IndexError:
    print(now(), "Cancellations table is unexpectedly short")
    table = []

output = []
for row in table:
    try:
        date, name, _, _, reason = [cell.strip() for cell in row[:5]]
    except Exception:
        print("Skipping malformed row:", row)
        continue

    if same_week(date):
        output.append({
            "name": name,
            "reason": reason,
            "date": date
        })

output_path = "_data/cancellations.json"
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=4, ensure_ascii=False)

print(now(), f"{len(output)} cancellations saved to {output_path}")
