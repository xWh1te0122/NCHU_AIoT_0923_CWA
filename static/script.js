// 22 Counties Coordinates
const COORDINATES = {
    "臺北市": [25.0329694, 121.5654177],
    "新北市": [25.017056, 121.462768],
    "基隆市": [25.127603, 121.739183],
    "桃園市": [24.993628, 121.300979],
    "新竹縣": [24.838322, 121.014100],
    "新竹市": [24.813828, 120.967479],
    "苗栗縣": [24.560158, 120.821427],
    "臺中市": [24.147735, 120.673648],
    "彰化縣": [24.051796, 120.539458],
    "南投縣": [23.960823, 120.971864],
    "雲林縣": [23.709203, 120.431337],
    "嘉義縣": [23.451852, 120.255461],
    "嘉義市": [23.480075, 120.449111],
    "臺南市": [22.999728, 120.227027],
    "高雄市": [22.627278, 120.301435],
    "屏東縣": [22.672583, 120.485121],
    "宜蘭縣": [24.730310, 121.758410],
    "花蓮縣": [23.987158, 121.601071],
    "臺東縣": [22.758333, 121.144444],
    "澎湖縣": [23.571089, 119.569974],
    "金門縣": [24.449167, 118.375556],
    "連江縣": [26.151772, 119.946114]
};

let map, CartoDark, OSMStreet;
let markers = [];
let weatherData = [];

async function initApp() {
    try {
        // 從後端讀取 ENV 中的金鑰
        const configRes = await fetch('/api/config');
        const configJson = await configRes.json();
        const cartoApiKey = configJson.carto_api_key || '';
        
        CartoDark = L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`, {
            attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });

        OSMStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        });

        map = L.map('map', {
            center: [23.7, 121],
            zoom: 7.5,
            layers: [CartoDark],
            zoomControl: false
        });
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        setupEventListeners();
        await loadData();
    } catch(err) {
        console.error("Init Error:", err);
    }
}

function setupEventListeners() {
    document.getElementById('layerTemp').addEventListener('change', renderMarkers);
    document.getElementById('layerPop').addEventListener('change', renderMarkers);

    document.getElementById('btnDarkMap').addEventListener('click', (e) => {
        map.removeLayer(OSMStreet);
        map.addLayer(CartoDark);
        e.target.classList.add('active');
        document.getElementById('btnStreetMap').classList.remove('active');
    });

    document.getElementById('btnStreetMap').addEventListener('click', (e) => {
        map.removeLayer(CartoDark);
        map.addLayer(OSMStreet);
        e.target.classList.add('active');
        document.getElementById('btnDarkMap').classList.remove('active');
    });
}

// Fetch API
async function loadData() {
    try {
        const response = await fetch('/api/weather');
        const json = await response.json();
        
        if(json.status === 'success') {
            weatherData = json.data;
            renderMarkers();
            
            // Hide Loader
            const loader = document.getElementById('loader');
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        } else {
            alert('Failed to load data from API.');
        }
    } catch(err) {
        console.error(err);
        alert('API Connection Error');
    }
}

// Render Markers
function renderMarkers() {
    // Clear old markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    const showTemp = document.getElementById('layerTemp').checked;
    const showPop = document.getElementById('layerPop').checked;

    weatherData.forEach(county => {
        const coords = COORDINATES[county.location_name];
        if(!coords) return;
        
        // Build Pill Label
        let label = county.location_name;
        if(showTemp && county.avg_t) label += ` | ${county.avg_t}°C`;
        if(showPop && county.pop_12h && county.pop_12h.trim() !== '') label += ` | 💧${county.pop_12h}%`;

        // Create Custom Icon
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="pill-marker">${label}</div>`,
            iconSize: [null, null],
            iconAnchor: [0, 0]
        });

        // Popup Content
        const popupContent = `
            <div class="weather-popup">
                <h2>${county.location_name}</h2>
                <div class="data-row"><span>天氣</span> <span>${county.wx || '--'}</span></div>
                <div class="data-row"><span>均溫</span> <span>${county.avg_t || '--'}°C</span></div>
                <div class="data-row"><span>最高/低</span> <span>${county.max_t || '--'}°C / ${county.min_t || '--'}°C</span></div>
                <div class="data-row"><span>降雨機率</span> <span>${county.pop_12h && county.pop_12h.trim() ? county.pop_12h : '0'}%</span></div>
                <div class="data-row" style="margin-top:8px; font-size:0.8rem; color:#64748b;"><span>預報時間</span> <span>${new Date(county.forecast_start).toLocaleString('zh-TW')}</span></div>
            </div>
        `;

        const marker = L.marker(coords, { icon }).addTo(map);
        marker.bindPopup(popupContent, { className: 'custom-popup', offset: [50, 10] });
        markers.push(marker);
    });
}

// Init
window.onload = initApp;
