/**
 * NCHU AIoT × CWA Weather Dashboard
 * Core Logic & Data Controller
 */

// Simulated and Default Taiwan CWA Representative Data
const CITY_WEATHER_DATABASE = {
  "Taichung": {
    name: "臺中市 (中興大學校本部)",
    district: "南區興大路145號",
    temp: 28.5,
    feelsLike: 30.2,
    condition: "多雲時晴",
    icon: "⛅",
    rainChance: "15%",
    humidity: "68%",
    wind: "西北風 12 km/h",
    uvIndex: "6 (高量級)",
    airQuality: "38 (良好)",
    tempHourly: [24, 23, 23, 22, 24, 27, 29, 31, 31, 29, 27, 25],
    humHourly: [80, 82, 85, 85, 78, 68, 62, 58, 60, 65, 72, 76],
    forecast: [
      { day: "今天", icon: "⛅", rain: "15%", max: 31, min: 24 },
      { day: "週四", icon: "☀️", rain: "10%", max: 32, min: 25 },
      { day: "週五", icon: "🌤️", rain: "20%", max: 31, min: 25 },
      { day: "週六", icon: "🌦️", rain: "40%", max: 29, min: 24 },
      { day: "週日", icon: "🌧️", rain: "60%", max: 28, min: 23 }
    ]
  },
  "Taipei": {
    name: "臺北市",
    district: "中正區氣象署本部",
    temp: 27.2,
    feelsLike: 29.0,
    condition: "陰短暫雨",
    icon: "🌦️",
    rainChance: "45%",
    humidity: "75%",
    wind: "東北風 18 km/h",
    uvIndex: "4 (中量級)",
    airQuality: "42 (良好)",
    tempHourly: [23, 23, 22, 22, 23, 25, 27, 28, 28, 26, 25, 24],
    humHourly: [85, 86, 88, 87, 82, 75, 72, 70, 73, 78, 80, 82],
    forecast: [
      { day: "今天", icon: "🌦️", rain: "45%", max: 28, min: 22 },
      { day: "週四", icon: "🌧️", rain: "60%", max: 27, min: 22 },
      { day: "週五", icon: "⛅", rain: "30%", max: 29, min: 23 },
      { day: "週六", icon: "☀️", rain: "15%", max: 31, min: 24 },
      { day: "週日", icon: "🌤️", rain: "20%", max: 30, min: 24 }
    ]
  },
  "NewTaipei": {
    name: "新北市",
    district: "板橋觀測站",
    temp: 26.8,
    feelsLike: 28.5,
    condition: "陰天",
    icon: "☁️",
    rainChance: "35%",
    humidity: "76%",
    wind: "偏東風 15 km/h",
    uvIndex: "4 (中量級)",
    airQuality: "45 (良好)",
    tempHourly: [23, 22, 22, 21, 23, 25, 27, 27, 27, 26, 24, 23],
    humHourly: [86, 88, 88, 86, 80, 76, 73, 71, 74, 80, 83, 85],
    forecast: [
      { day: "今天", icon: "☁️", rain: "35%", max: 27, min: 22 },
      { day: "週四", icon: "🌦️", rain: "50%", max: 26, min: 22 },
      { day: "週五", icon: "⛅", rain: "25%", max: 28, min: 23 },
      { day: "週六", icon: "☀️", rain: "10%", max: 30, min: 24 },
      { day: "週日", icon: "🌤️", rain: "20%", max: 30, min: 24 }
    ]
  },
  "Kaohsiung": {
    name: "高雄市",
    district: "前鎮觀測站",
    temp: 30.5,
    feelsLike: 34.0,
    condition: "晴時多雲",
    icon: "☀️",
    rainChance: "10%",
    humidity: "62%",
    wind: "西南風 10 km/h",
    uvIndex: "8 (過量級)",
    airQuality: "56 (普通)",
    tempHourly: [26, 25, 25, 25, 26, 29, 31, 33, 32, 30, 28, 27],
    humHourly: [75, 76, 78, 77, 72, 64, 58, 55, 58, 64, 70, 72],
    forecast: [
      { day: "今天", icon: "☀️", rain: "10%", max: 33, min: 25 },
      { day: "週四", icon: "☀️", rain: "10%", max: 34, min: 26 },
      { day: "週五", icon: "⛅", rain: "15%", max: 33, min: 26 },
      { day: "週六", icon: "🌤️", rain: "20%", max: 32, min: 25 },
      { day: "週日", icon: "🌦️", rain: "30%", max: 31, min: 25 }
    ]
  },
  "Tainan": {
    name: "臺南市",
    district: "中西區觀測站",
    temp: 29.8,
    feelsLike: 32.5,
    condition: "晴天",
    icon: "☀️",
    rainChance: "10%",
    humidity: "65%",
    wind: "南風 11 km/h",
    uvIndex: "8 (過量級)",
    airQuality: "52 (普通)",
    tempHourly: [25, 24, 24, 24, 25, 28, 30, 32, 32, 29, 27, 26],
    humHourly: [76, 78, 80, 79, 74, 66, 60, 56, 60, 66, 72, 74],
    forecast: [
      { day: "今天", icon: "☀️", rain: "10%", max: 32, min: 24 },
      { day: "週四", icon: "☀️", rain: "10%", max: 33, min: 25 },
      { day: "週五", icon: "🌤️", rain: "15%", max: 32, min: 25 },
      { day: "週六", icon: "⛅", rain: "20%", max: 31, min: 25 },
      { day: "週日", icon: "🌦️", rain: "30%", max: 30, min: 24 }
    ]
  },
  "Hualien": {
    name: "花蓮縣",
    district: "花蓮氣象站",
    temp: 26.2,
    feelsLike: 28.0,
    condition: "多雲短暫陣雨",
    icon: "🌦️",
    rainChance: "50%",
    humidity: "78%",
    wind: "東北風 20 km/h",
    uvIndex: "5 (中量級)",
    airQuality: "25 (良好)",
    tempHourly: [23, 22, 22, 22, 23, 25, 27, 27, 26, 25, 24, 23],
    humHourly: [88, 89, 90, 89, 84, 78, 74, 73, 76, 82, 85, 87],
    forecast: [
      { day: "今天", icon: "🌦️", rain: "50%", max: 27, min: 22 },
      { day: "週四", icon: "🌧️", rain: "65%", max: 26, min: 22 },
      { day: "週五", icon: "🌦️", rain: "40%", max: 28, min: 23 },
      { day: "週六", icon: "⛅", rain: "25%", max: 29, min: 24 },
      { day: "週日", icon: "🌤️", rain: "20%", max: 29, min: 24 }
    ]
  }
};

// AIoT Simulated Sensor Baseline
let aiotTelemetry = {
  soilMoisture: 42.8, // %
  lux: 12500,        // Lux
  pressure: 1013.2,   // hPa
  battery: 98,        // %
  signalRssi: -62     // dBm
};

// State
let currentCityKey = "Taichung";
let isCelsius = true;

// DOM Elements
const timeEl = document.getElementById("liveTime");
const dateEl = document.getElementById("liveDate");
const citySelectEl = document.getElementById("citySelect");
const refreshBtn = document.getElementById("refreshBtn");
const apiModalBtn = document.getElementById("apiModalBtn");
const apiModal = document.getElementById("apiModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const saveApiBtn = document.getElementById("saveApiBtn");
const apiKeyInput = document.getElementById("apiKeyInput");

// Weather Elements
const locTitleEl = document.getElementById("locationTitle");
const locSubEl = document.getElementById("locationSubtitle");
const cwIconEl = document.getElementById("cwIcon");
const cwTempEl = document.getElementById("cwTemp");
const cwConditionEl = document.getElementById("cwCondition");
const cwFeelsLikeEl = document.getElementById("cwFeelsLike");

const valHumidityEl = document.getElementById("valHumidity");
const valRainEl = document.getElementById("valRain");
const valWindEl = document.getElementById("valWind");
const valUvEl = document.getElementById("valUv");

// AIoT Elements
const aiotSoilEl = document.getElementById("aiotSoil");
const aiotSoilBar = document.getElementById("aiotSoilBar");
const aiotLuxEl = document.getElementById("aiotLux");
const aiotLuxBar = document.getElementById("aiotLuxBar");
const aiotPressureEl = document.getElementById("aiotPressure");
const aiotPressureBar = document.getElementById("aiotPressureBar");
const aiotRssiEl = document.getElementById("aiotRssi");
const aiotRssiBar = document.getElementById("aiotRssiBar");

const forecastListEl = document.getElementById("forecastList");
const trendCanvas = document.getElementById("trendChart");

// 1. Clock Update
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  if (timeEl) timeEl.textContent = `${hours}:${minutes}:${seconds}`;

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const dayNames = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
  const day = dayNames[now.getDay()];
  if (dateEl) dateEl.textContent = `${year}年${month}月${date}日 ${day}`;
}

// 2. Render Weather Data
function renderWeather(cityKey) {
  const data = CITY_WEATHER_DATABASE[cityKey] || CITY_WEATHER_DATABASE["Taichung"];
  
  if (locTitleEl) locTitleEl.textContent = data.name;
  if (locSubEl) locSubEl.textContent = data.district;
  if (cwIconEl) cwIconEl.textContent = data.icon;
  if (cwTempEl) cwTempEl.textContent = data.temp.toFixed(1);
  if (cwConditionEl) cwConditionEl.textContent = data.condition;
  if (cwFeelsLikeEl) cwFeelsLikeEl.textContent = `體感溫度 ${data.feelsLike.toFixed(1)}°C`;

  if (valHumidityEl) valHumidityEl.textContent = data.humidity;
  if (valRainEl) valRainEl.textContent = data.rainChance;
  if (valWindEl) valWindEl.textContent = data.wind;
  if (valUvEl) valUvEl.textContent = data.uvIndex;

  // Forecast List
  if (forecastListEl) {
    forecastListEl.innerHTML = "";
    data.forecast.forEach(item => {
      const row = document.createElement("div");
      row.className = "forecast-item";
      row.innerHTML = `
        <div class="f-day">${item.day}</div>
        <div class="f-icon">${item.icon}</div>
        <div class="f-rain">💧 ${item.rain}</div>
        <div class="f-temp">
          <span>${item.max}°</span>
          <span class="min">${item.min}°</span>
        </div>
      `;
      forecastListEl.appendChild(row);
    });
  }

  // Draw Canvas Trend Chart
  drawTrendChart(data.tempHourly, data.humHourly);
}

// 3. Render Simulated AIoT Sensor Telemetry
function updateAiotSensors() {
  // Add subtle realistic fluctuation
  aiotTelemetry.soilMoisture += (Math.random() - 0.5) * 0.4;
  aiotTelemetry.soilMoisture = Math.max(30, Math.min(85, aiotTelemetry.soilMoisture));

  aiotTelemetry.lux += Math.floor((Math.random() - 0.5) * 200);
  aiotTelemetry.lux = Math.max(800, Math.min(65000, aiotTelemetry.lux));

  aiotTelemetry.pressure += (Math.random() - 0.5) * 0.15;
  aiotTelemetry.pressure = Math.max(990, Math.min(1030, aiotTelemetry.pressure));

  if (aiotSoilEl) aiotSoilEl.textContent = aiotTelemetry.soilMoisture.toFixed(1);
  if (aiotSoilBar) aiotSoilBar.style.width = `${aiotTelemetry.soilMoisture}%`;

  if (aiotLuxEl) aiotLuxEl.textContent = aiotTelemetry.lux.toLocaleString();
  const luxPercent = Math.min(100, Math.round((aiotTelemetry.lux / 50000) * 100));
  if (aiotLuxBar) aiotLuxBar.style.width = `${luxPercent}%`;

  if (aiotPressureEl) aiotPressureEl.textContent = aiotTelemetry.pressure.toFixed(1);
  const pressPercent = Math.min(100, Math.max(0, ((aiotTelemetry.pressure - 980) / 50) * 100));
  if (aiotPressureBar) aiotPressureBar.style.width = `${pressPercent}%`;

  if (aiotRssiEl) aiotRssiEl.textContent = `${aiotTelemetry.signalRssi} dBm`;
  if (aiotRssiBar) aiotRssiBar.style.width = "85%";
}

// 4. Interactive Trend Chart (Native HTML5 Canvas)
function drawTrendChart(tempData, humData) {
  if (!trendCanvas) return;
  const ctx = trendCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = trendCanvas.getBoundingClientRect();

  trendCanvas.width = rect.width * dpr;
  trendCanvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 30, right: 30, bottom: 40, left: 40 };
  const graphW = w - padding.left - padding.right;
  const graphH = h - padding.top - padding.bottom;

  ctx.clearRect(0, 0, w, h);

  const hoursLabels = ["02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "24:00"];
  const n = tempData.length;

  // Grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (graphH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }

  // Draw X axis labels
  ctx.fillStyle = "#64748b";
  ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  for (let i = 0; i < n; i++) {
    const x = padding.left + (graphW / (n - 1)) * i;
    if (i % 2 === 0 || i === n - 1) {
      ctx.fillText(hoursLabels[i], x, h - 12);
    }
  }

  // Temperature Bounds
  const minTemp = 18;
  const maxTemp = 36;
  const getTempY = (t) => padding.top + graphH - ((t - minTemp) / (maxTemp - minTemp)) * graphH;

  // Humidity Bounds
  const minHum = 40;
  const maxHum = 100;
  const getHumY = (hum) => padding.top + graphH - ((hum - minHum) / (maxHum - minHum)) * graphH;

  // 1. Draw Humidity Gradient Curve
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = padding.left + (graphW / (n - 1)) * i;
    const y = getHumY(humData[i]);
    if (i === 0) ctx.moveTo(x, y);
    else {
      const prevX = padding.left + (graphW / (n - 1)) * (i - 1);
      const prevY = getHumY(humData[i - 1]);
      const cpX1 = prevX + (x - prevX) / 2;
      ctx.bezierCurveTo(cpX1, prevY, cpX1, y, x, y);
    }
  }
  ctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Draw Temperature Curve with Glow Fill
  const tempGrad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  tempGrad.addColorStop(0, "rgba(56, 189, 248, 0.3)");
  tempGrad.addColorStop(1, "rgba(56, 189, 248, 0.0)");

  ctx.beginPath();
  let firstX = padding.left;
  let firstY = getTempY(tempData[0]);
  ctx.moveTo(firstX, firstY);

  for (let i = 1; i < n; i++) {
    const x = padding.left + (graphW / (n - 1)) * i;
    const y = getTempY(tempData[i]);
    const prevX = padding.left + (graphW / (n - 1)) * (i - 1);
    const prevY = getTempY(tempData[i - 1]);
    const cpX1 = prevX + (x - prevX) / 2;
    ctx.bezierCurveTo(cpX1, prevY, cpX1, y, x, y);
  }

  // Complete shape for gradient fill
  ctx.lineTo(padding.left + graphW, padding.top + graphH);
  ctx.lineTo(padding.left, padding.top + graphH);
  ctx.closePath();
  ctx.fillStyle = tempGrad;
  ctx.fill();

  // Draw Temperature Line stroke
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = padding.left + (graphW / (n - 1)) * i;
    const y = getTempY(tempData[i]);
    if (i === 0) ctx.moveTo(x, y);
    else {
      const prevX = padding.left + (graphW / (n - 1)) * (i - 1);
      const prevY = getTempY(tempData[i - 1]);
      const cpX1 = prevX + (x - prevX) / 2;
      ctx.bezierCurveTo(cpX1, prevY, cpX1, y, x, y);
    }
  }
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(56, 189, 248, 0.5)";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw points & values on temperature line
  for (let i = 0; i < n; i++) {
    const x = padding.left + (graphW / (n - 1)) * i;
    const y = getTempY(tempData[i]);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text value
    if (i % 2 === 0 || i === n - 1) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 11px 'Outfit', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${tempData[i]}°`, x, y - 10);
    }
  }
}

// 5. Fetch Real CWA Data (Optional when API key provided)
async function fetchCwaDataIfKeyAvailable() {
  const apiKey = localStorage.getItem("CWA_API_KEY");
  if (!apiKey) return;

  try {
    const endpoint = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("CWA API 請求失敗");
    const json = await res.json();
    console.log("CWA API 連線成功:", json);
  } catch (err) {
    console.warn("CWA API 呼叫略過或失敗，繼續使用高精度預置資料:", err);
  }
}

// Event Listeners
if (citySelectEl) {
  citySelectEl.addEventListener("change", (e) => {
    currentCityKey = e.target.value;
    renderWeather(currentCityKey);
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    refreshBtn.classList.add("spin");
    setTimeout(() => {
      updateAiotSensors();
      renderWeather(currentCityKey);
      refreshBtn.classList.remove("spin");
    }, 600);
  });
}

// Modal controls
if (apiModalBtn && apiModal) {
  apiModalBtn.addEventListener("click", () => {
    const saved = localStorage.getItem("CWA_API_KEY") || "";
    if (apiKeyInput) apiKeyInput.value = saved;
    apiModal.classList.add("active");
  });
}

if (closeModalBtn && apiModal) {
  closeModalBtn.addEventListener("click", () => {
    apiModal.classList.remove("active");
  });
}

if (saveApiBtn && apiModal) {
  saveApiBtn.addEventListener("click", () => {
    const val = apiKeyInput ? apiKeyInput.value.trim() : "";
    if (val) {
      localStorage.setItem("CWA_API_KEY", val);
      alert("✅ 氣象署 CWA API 授權碼已儲存！");
    } else {
      localStorage.removeItem("CWA_API_KEY");
      alert("已清除 API 授權碼，恢復預設展示模式。");
    }
    apiModal.classList.remove("active");
    fetchCwaDataIfKeyAvailable();
  });
}

// Handle window resize for dynamic canvas redraw
window.addEventListener("resize", () => {
  const data = CITY_WEATHER_DATABASE[currentCityKey] || CITY_WEATHER_DATABASE["Taichung"];
  drawTrendChart(data.tempHourly, data.humHourly);
});

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);

  updateAiotSensors();
  setInterval(updateAiotSensors, 3500);

  renderWeather(currentCityKey);
  fetchCwaDataIfKeyAvailable();
});
