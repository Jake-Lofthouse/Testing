const fs = require('fs');
const https = require('https');
const path = require('path');

const EVENTS_URL = 'https://raw.githubusercontent.com/ALD-Models/Testing/refs/heads/main/events1.json';
const OUTPUT_DIR = './events';
const MAX_EVENTS = 13;
const BASE_URL = 'https://www.parkrunnertourist.co.uk/events';

// Country bounds for parkrun URL detection
const COUNTRIES = {
  "0": {
    "url": null,
    "bounds": [-141.002, -47.29, 180, 83.1132]
  },
  "3": {
    "url": "www.parkrun.com.au",
    "bounds": [112.921, -43.6432, 153.639, -10.0591]
  },
  "4": {
    "url": "www.parkrun.co.at",
    "bounds": [9.53095, 46.3727, 17.1621, 49.0212]
  },
  "14": {
    "url": "www.parkrun.ca",
    "bounds": [-141.002, 41.6766, -52.6191, 83.1132]
  },
  "23": {
    "url": "www.parkrun.dk",
    "bounds": [8.07251, 54.5591, 15.157, 57.3282]
  },
  "30": {
    "url": "www.parkrun.fi",
    "bounds": [20.5486, 59.8078, 31.5867, 70.0923]
  },
  "32": {
    "url": "www.parkrun.com.de",
    "bounds": [5.86632, 47.2701, 15.0418, 55.0584]
  },
  "42": {
    "url": "www.parkrun.ie",
    "bounds": [-10.48, 51.4475, -5.99805, 55.3829]
  },
  "44": {
    "url": "www.parkrun.it",
    "bounds": [6.62662, 36.6441, 18.5204, 47.0918]
  },
  "46": {
    "url": "www.parkrun.jp",
    "bounds": [122.934, 24.2552, 145.817, 45.523]
  },
  "54": {
    "url": "www.parkrun.lt",
    "bounds": [20.9415, 53.8968, 26.8355, 56.4504]
  },
  "57": {
    "url": "www.parkrun.my",
    "bounds": [99.6407, 0.855001, 119.27, 7.36334]
  },
  "64": {
    "url": "www.parkrun.co.nl",
    "bounds": [3.35838, 50.7504, 7.2275, 53.5157]
  },
  "65": {
    "url": "www.parkrun.co.nz",
    "bounds": [166.724, -47.29, 180, -34.3928]
  },
  "67": {
    "url": "www.parkrun.no",
    "bounds": [4.64182, 57.9799, 31.0637, 71.1855]
  },
  "74": {
    "url": "www.parkrun.pl",
    "bounds": [14.1229, 49.002, 24.1458, 54.8358]
  },
  "82": {
    "url": "www.parkrun.sg",
    "bounds": [103.606, 1.21065, 104.044, 1.47077]
  },
  "85": {
    "url": "www.parkrun.co.za",
    "bounds": [16.4519, -34.8342, 32.945, -22.125]
  },
  "88": {
    "url": "www.parkrun.se",
    "bounds": [11.1095, 55.3374, 24.1552, 69.06]
  },
  "97": {
    "url": "www.parkrun.org.uk",
    "bounds": [-8.61772, 49.9029, 1.76891, 59.3608]
  },
  "98": {
    "url": "www.parkrun.us",
    "bounds": [-124.733, 24.5439, -66.9492, 49.3845]
  }
};

// Helper: fetch JSON over HTTPS
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

// Slugify event name for URLs
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

// Get next Friday date ISO string (YYYY-MM-DD)
function getNextFridayDateISO() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  today.setDate(today.getDate() + daysUntilFriday);
  return today.toISOString().slice(0, 10);
}

// Determine parkrun domain based on coordinates
function getParkrunDomain(latitude, longitude) {
  for (const country of Object.values(COUNTRIES)) {
    if (country.url && country.bounds) {
      const [minLng, minLat, maxLng, maxLat] = country.bounds;
      if (longitude >= minLng && longitude <= maxLng && latitude >= minLat && latitude <= maxLat) {
        return country.url;
      }
    }
  }
  return "www.parkrun.org.uk"; // Default fallback
}

// Stub for fetching Wikipedia description about the parkrun location.
async function fetchWikipediaDescription(eventName) {
  return null;
}

// Generate the HTML content for each event page
async function generateHtml(event) {
  const name = event.properties.eventname || 'Unknown event';
  const longName = event.properties.EventLongName || name;
  const location = event.properties.EventLocation || '';
  const coords = event.geometry.coordinates || [];
  const latitude = coords[1] || 0;
  const longitude = coords[0] || 0;
  const encodedName = encodeURIComponent(`${name} parkrun`);
  const checkinDate = getNextFridayDateISO();
  const pageTitle = `Accommodation near ${name} parkrun`;
  const parkrunDomain = getParkrunDomain(latitude, longitude);

  let description = event.properties.EventDescription || '';
  const hasDescription = description && description.trim() !== '' && description.trim() !== 'No description available.';

  if (hasDescription) {
    try {
      const wikiDesc = await fetchWikipediaDescription(name);
      if (wikiDesc && wikiDesc.length > 50) {
        description = `<p>${wikiDesc}</p><p><em>Source: <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, '_'))}" target="_blank" rel="noopener noreferrer">Wikipedia</a></em></p>`;
      } else {
        description = `<p>${description.replace(/</g, '<').replace(/>/g, '>')}</p>`;
      }
    } catch (e) {
      console.warn(`Failed to fetch Wikipedia description for ${name}: ${e.message}`);
      description = `<p>${description.replace(/</g, '<').replace(/>/g, '>')}</p>`;
    }
  }

  // Stay22 iframe base URL with scroll locking via scrolling="no"
  const stay22BaseUrl = `https://www.stay22.com/embed/gm?aid=parkrunnertourist&lat=${latitude}&lng=${longitude}&checkin=${checkinDate}&maincolor=7dd856&venue=${encodedName}`;

  // Determine if it's a junior parkrun and set the appropriate URL
  const isJunior = longName.toLowerCase().includes('junior');
  const parkrunType = isJunior ? 'Junior' : '5k';
  const mainIframeUrl = `https://parkrunnertourist.co.uk/main?${parkrunType}&lat=${latitude}&lon=${longitude}&zoom=13`;

  // Weather iframe URL
  const weatherIframeUrl = `https://parkrunnertourist.co.uk/weather?lat=${latitude}&lon=${longitude}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <meta name="description" content="Find and book hotels, campsites, and cafes around ${name} parkrun." />
  <meta name="keywords" content="parkrun, accommodation, hotels, stay, tourist, ${name.toLowerCase()}" />
  <meta name="author" content="Jake Lofthouse">
  meta property="og:image" content="https://www.parkrunnertourist.co.uk/Images/Feature.jpg">
  <meta property="og:url" content="https://www.parkrunnertourist.co.uk">
  <meta property="og:type" content="website">
  <link rel="canonical" href="${BASE_URL}/${slugify(name)}.html" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Apple Smart Banner -->
  <meta name="apple-itunes-app" content="app-id=6743163993, app-argument=https://www.parkrunnertourist.co.uk">

  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="favicon.ico">

  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 0; 
      padding: 0;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      line-height: 1.6;
    }
    
    header {
      background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
      color: white;
      padding: 1.5rem 2rem;
      font-weight: 600;
      font-size: 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(46, 125, 50, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/></svg>');
      pointer-events: none;
    }
    
    header a {
      color: white;
      text-decoration: none;
      cursor: pointer;
      position: relative;
      z-index: 1;
      transition: transform 0.3s ease;
    }
    
    header a:hover {
      transform: translateY(-2px);
    }
    
    main {
      padding: 3rem 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    h1 {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #2e7d32, #4caf50);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-align: center;
      position: relative;
      padding: 2rem 0;
      line-height: 1.2;
    }
    
    .subtitle {
      font-size: 1.5rem;
      font-weight: 600;
      color: #4caf50;
      text-align: center;
      margin-bottom: 3rem;
      position: relative;
    }
    
    .subtitle::after {
      content: '';
      position: absolute;
      bottom: -1rem;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      height: 4px;
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      border-radius: 2px;
    }
    
    .description {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      margin-bottom: 3rem;
      border: 1px solid rgba(76, 175, 80, 0.2);
    }
    
    .description p {
      margin: 0;
      color: #374151;
      font-size: 1.1rem;
    }
    
    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #1f2937;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .section-title::before {
      content: '';
      width: 4px;
      height: 1.5rem;
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      border-radius: 2px;
    }
    
    .toggle-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      margin-right: 1rem;
      margin-bottom: 1rem;
      cursor: pointer;
      font-weight: 600;
      border: 2px solid #4caf50;
      transition: all 0.3s ease;
      background-color: white;
      color: #4caf50;
      user-select: none;
      font-size: 1rem;
      box-shadow: 0 2px 10px rgba(76, 175, 80, 0.2);
    }
    
    .toggle-btn:hover:not(.active) {
      background-color: #f1f8e9;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    }
    
    .toggle-btn.active {
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
    }
    
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }
    
    .iframe-container {
      background: white;
      border-radius: 1rem;
      padding: 1rem;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(76, 175, 80, 0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      overflow: hidden;
    }
    
    .iframe-container:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    }
    
    iframe {
      width: 100%;
      border-radius: 0.75rem;
      border: none;
      overflow: hidden;
    }
    
    .weather-iframe {
      height: 300px;
      width: 100%;
    }
    
    .parkrun-actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 3rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .action-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      cursor: pointer;
      font-weight: 600;
      border: 2px solid #4caf50;
      transition: all 0.3s ease;
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      color: white;
      text-decoration: none;
      display: inline-block;
      font-size: 1rem;
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    }
    
    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
      background: linear-gradient(135deg, #388e3c, #1b5e20);
    }
    
    /* Modal Styles */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      backdrop-filter: blur(5px);
    }
    
    .modal-content {
      background-color: white;
      margin: 2% auto;
      padding: 0;
      border-radius: 1rem;
      width: 90%;
      max-width: 1000px;
      height: 90%;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    
    .modal-header {
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      color: white;
      padding: 2rem 2rem;
      border-radius: 1rem 1rem 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-header h2 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0;
      color: white;
    }
    
    .close {
      color: white;
      float: right;
      font-size: 2.5rem;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    
    .close:hover {
      transform: scale(1.1);
    }
    
    .modal iframe {
      width: 100%;
      height: calc(100% - 100px);
      border: none;
      border-radius: 0 0 1rem 1rem;
    }
    
    .accommodation-iframe {
      height: 600px;
      overflow-x: hidden;
    }
    
    .map-iframe {
      height: 400px;
    }
    
    .hotels-section {
      grid-column: 1;
    }
    
    .right-column {
      grid-column: 2;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    
    /* Download footer */
    .download-footer {
      background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
      padding: 3rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      color: white;
      font-weight: 700;
      font-size: 1.3rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      position: relative;
      overflow: hidden;
    }
    
    .download-footer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="25" cy="25" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="45" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="45" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></svg>');
      pointer-events: none;
    }
    
    .app-badges {
      display: flex;
      gap: 2rem;
      position: relative;
      z-index: 1;
    }
    
    .download-footer img {
      height: 70px;
      width: auto;
      background: none;
      transition: transform 0.3s ease, filter 0.3s ease;
      cursor: pointer;
      border-radius: 0.5rem;
    }
    
    .download-footer img:hover {
      transform: scale(1.1) translateY(-4px);
      filter: brightness(1.1);
    }
    
    footer {
      text-align: center;
      padding: 2rem;
      background: #f8fafc;
      color: #64748b;
      font-weight: 500;
    }
    
    /* Responsive Design */
    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      
      /* Mobile order: parkrun location, hotels, weather */
      .right-column {
        order: 1;
        grid-column: 1;
        flex-direction: column-reverse;
      }
      
      .hotels-section {
        order: 2;
        grid-column: 1;
      }
      
      .weather-iframe {
        height: 250px;
      }
      
      .accommodation-iframe,
      .map-iframe {
        height: 450px;
      }
      
      .app-badges {
        justify-content: center;
      }
    }
    
    @media (max-width: 768px) {
      main {
        padding: 2rem 1rem;
      }
      
      h1 {
        font-size: 2.5rem;
      }
      
      .subtitle {
        font-size: 1.2rem;
      }
      
      header {
        padding: 1rem;
        font-size: 1.5rem;
      }
      
      .toggle-btn {
        margin-bottom: 0.5rem;
        margin-right: 0.5rem;
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
      }
      
      .app-badges {
        flex-direction: column;
        gap: 1rem;
        align-items: center;
      }
      
      .accommodation-iframe,
      .map-iframe {
        height: 400px;
      }
      
      .weather-iframe {
        height: 200px;
      }
      
      .modal-header h2 {
        font-size: 1.5rem;
      }
      
      .close {
        font-size: 2rem;
      }
    }
    
    /* Hide Buy Me a Coffee widget on mobile and tablets */
    @media (max-width: 1024px) {
      [data-name="BMC-Widget"] {
        display: none !important;
      }
    }
  </style>
</head>
<body>

<header>
  <a href="https://www.parkrunnertourist.co.uk" target="_self" title="Go to parkrunner tourist homepage">parkrunner tourist</a>
  <div></div>
</header>

<main>
  <div class="subtitle">Accommodation near ${longName} </div>
  
  <div class="parkrun-actions">
    <a href="#" class="action-btn" onclick="openModal('courseModal', '${name}')">Course Map</a>
    <a href="#" class="action-btn" onclick="openModal('volunteerModal', '${name}')">Volunteer Roster</a>
    <a href="https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}" target="_blank" class="action-btn">Directions</a>
  </div>
  
  ${hasDescription ? `<div class="description">
    ${description}
  </div>` : ''}

  <div class="content-grid">
    <div class="hotels-section">
      <div class="iframe-container">
        <h2 class="section-title">Hotel Prices</h2>
        <div>
          <button class="toggle-btn active" onclick="switchView('listview')" id="btn-listview">List View</button>
          <button class="toggle-btn" onclick="switchView('map')" id="btn-map">Map View</button>
        </div>
        <iframe id="stay22Frame" class="accommodation-iframe" scrolling="no"
          src="${stay22BaseUrl}&viewmode=listview&listviewexpand=true"
          title="Stay22 accommodation listing">
        </iframe>
      </div>
    </div>

    <div class="right-column">
      <div class="iframe-container">
        <h2 class="section-title">parkrun Location</h2>
        <iframe class="map-iframe" src="${mainIframeUrl}" title="parkrun Map"></iframe>
      </div>
      
      <div class="iframe-container">
        <h2 class="section-title">Weather This Week</h2>
        <iframe class="weather-iframe" src="${weatherIframeUrl}" title="Weather forecast for ${name}"></iframe>
      </div>
    </div>
  </div>
</main>

<!-- Course Modal -->
<div id="courseModal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Course Map</h2>
      <span class="close" onclick="closeModal('courseModal')">&times;</span>
    </div>
    <iframe id="courseIframe" src="" title="Course Map"></iframe>
  </div>
</div>

<!-- Volunteer Modal -->
<div id="volunteerModal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Volunteer Roster</h2>
      <span class="close" onclick="closeModal('volunteerModal')">&times;</span>
    </div>
    <iframe id="volunteerIframe" src="" title="Volunteer Roster"></iframe>
  </div>
</div>

<div class="download-footer">
  Download The App
  <div class="app-badges">
    <a href="https://apps.apple.com/gb/app/parkrunner-tourist/id6743163993" target="_blank" rel="noopener noreferrer">
      <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" />
    </a>
    <a href="https://play.google.com/store/apps/details?id=appinventor.ai_jlofty8.parkrunner_tourist" target="_blank" rel="noopener noreferrer">
      <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
    </a>
  </div>
</div>

<footer>
  &copy; ${new Date().getFullYear()} parkrunner tourist - Find your next running adventure
</footer>

<!-- Buy Me a Coffee Widget - Hidden on mobile and tablets -->
<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="jlofthouse" data-description="Support me on Buy me a coffee!" data-message="Support The App" data-color="#40DCA5" data-position="Right" data-x_margin="18" data-y_margin="18"></script>

<script>
  function switchView(mode) {
    const iframe = document.getElementById('stay22Frame');
    const baseUrl = "${stay22BaseUrl}";
    iframe.src = baseUrl + "&viewmode=" + mode + "&listviewexpand=" + (mode === 'listview');
    document.getElementById('btn-listview').classList.toggle('active', mode === 'listview');
    document.getElementById('btn-map').classList.toggle('active', mode === 'map');
  }
  
  // Modal functions
  function openModal(modalId, eventName) {
    const modal = document.getElementById(modalId);
    const eventSlug = eventName.toLowerCase().replace(/\\s+/g, '');
    
    if (modalId === 'courseModal') {
      const courseIframe = document.getElementById('courseIframe');
      courseIframe.src = \`https://${parkrunDomain}/\${eventSlug}/course/\`;
    } else if (modalId === 'volunteerModal') {
      const volunteerIframe = document.getElementById('volunteerIframe');
      volunteerIframe.src = \`https://${parkrunDomain}/\${eventSlug}/futureroster/\`;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Clear iframe src to stop loading
    if (modalId === 'courseModal') {
      document.getElementById('courseIframe').src = '';
    } else if (modalId === 'volunteerModal') {
      document.getElementById('volunteerIframe').src = '';
    }
  }
  
  // Close modal when clicking outside
  window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
      closeModal(event.target.id);
    }
  }
  
  // Add loading states for iframes
  document.addEventListener('DOMContentLoaded', function() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const container = iframe.closest('.iframe-container');
      iframe.addEventListener('load', function() {
        if (container) {
          container.style.background = 'white';
        }
      });
    });
  });
</script>

</body>
</html>`;
}

// Sitemap XML generator
function generateSitemap(slugs) {
  const today = new Date().toISOString().slice(0, 10);
  const urlset = slugs.map(slug => `
    <url>
      <loc>${BASE_URL}/${slug}.html</loc>
      <lastmod>${today}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.7</priority>
    </url>
  `).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;
}

async function main() {
  try {
    console.log('Fetching events JSON...');
    const data = await fetchJson(EVENTS_URL);

    let events;
    if (Array.isArray(data)) {
      events = data;
    } else if (Array.isArray(data.features)) {
      events = data.features;
    } else if (data.events && Array.isArray(data.events.features)) {
      events = data.events.features;
    } else {
      throw new Error('Unexpected JSON structure');
    }

    const selectedEvents = events.slice(0, MAX_EVENTS);
    const slugs = [];

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }

    for (const event of selectedEvents) {
      const slug = slugify(event.properties.eventname);
      slugs.push(slug);
      const filename = path.join(OUTPUT_DIR, `${slug}.html`);
      const htmlContent = await generateHtml(event);
      fs.writeFileSync(filename, htmlContent, 'utf-8');
      console.log(`Generated: ${filename}`);
    }

    // Save sitemap.xml in root directory
    const sitemapContent = generateSitemap(slugs);
    fs.writeFileSync('./sitemap.events.xml', sitemapContent, 'utf-8');
    console.log('Generated sitemap.xml in root folder.');

    console.log(`Successfully generated ${selectedEvents.length} event HTML files.`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
