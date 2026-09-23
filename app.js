/**
 * NCHU AIoT × CWA Weather Dashboard
 * Core Logic & Data Controller — Immersive UI v2
 */

// ---- City Weather Data ----
const CITY_WEATHER_DATABASE = {
  "Taichung": {
    name: "臺中市 (中興大學校本部)",
    district: "南區興大路145號",
    temp: 28.5, feelsLike: 30.2,
    condition: "多雲時晴", icon: "⛅",
    rainChance: 15, humidity: 68,
    uvIndex: "6 (高量級)", uvPct: 55,
    wind: "西北風 12 km/h", windPct: 30,
    tempHourly: [24, 23, 23, 22, 24, 27, 29, 31, 31, 29, 27, 25],
    humHourly:  [80, 82, 85, 85, 78, 68, 62, 58, 60, 65, 72, 76],
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
    temp: 27.2, feelsLike: 29.0,
    condition: "陰短暫雨", icon: "🌦️",
    rainChance: 45, humidity: 75,
    uvIndex: "4 (中量級)", uvPct: 37,
    wind: "東北風 18 km/h", windPct: 45,
    tempHourly: [23, 23, 22, 22, 23, 25, 27, 28, 28, 26, 25, 24],
    humHourly:  [85, 86, 88, 87, 82, 75, 72, 70, 73, 78, 80, 82],
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
    temp: 26.8, feelsLike: 28.5,
    condition: "陰天", icon: "☁️",
    rainChance: 35, humidity: 76,
    uvIndex: "4 (中量級)", uvPct: 37,
    wind: "偏東風 15 km/h", windPct: 38,
    tempHourly: [23, 22, 22, 21, 23, 25, 27, 27, 27, 26, 24, 23],
    humHourly:  [86, 88, 88, 86, 80, 76, 73, 71, 74, 80, 83, 85],
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
    temp: 30.5, feelsLike: 34.0,
    condition: "晴時多雲", icon: "☀️",
    rainChance: 10, humidity: 62,
    uvIndex: "8 (過量級)", uvPct: 72,
    wind: "西南風 10 km/h", windPct: 25,
    tempHourly: [26, 25, 25, 25, 26, 29, 31, 33, 32, 30, 28, 27],
    humHourly:  [75, 76, 78, 77, 72, 64, 58, 55, 58, 64, 70, 72],
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
    temp: 29.8, feelsLike: 32.5,
    condition: "晴天", icon: "☀️",
    rainChance: 10, humidity: 65,
    uvIndex: "8 (過量級)", uvPct: 72,
    wind: "南風 11 km/h", windPct: 28,
    tempHourly: [25, 24, 24, 24, 25, 28, 30, 32, 32, 29, 27, 26],
    humHourly:  [76, 78, 80, 79, 74, 66, 60, 56, 60, 66, 72, 74],
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
    temp: 26.2, feelsLike: 28.0,
    condition: "多雲短暫陣雨", icon: "🌦️",
    rainChance: 50, humidity: 78,
    uvIndex: "5 (中量級)", uvPct: 46,
    wind: "東北風 20 km/h", windPct: 50,
    tempHourly: [23, 22, 22, 22, 23, 25, 27, 27, 26, 25, 24, 23],
    humHourly:  [88, 89, 90, 89, 84, 78, 74, 73, 76, 82, 85, 87],
    forecast: [
      { day: "今天", icon: "🌦️", rain: "50%", max: 27, min: 22 },
      { day: "週四", icon: "🌧️", rain: "65%", max: 26, min: 22 },
      { day: "週五", icon: "🌦️", rain: "40%", max: 28, min: 23 },
      { day: "週六", icon: "⛅", rain: "25%", max: 29, min: 24 },
      { day: "週日", icon: "🌤️", rain: "20%", max: 29, min: 24 }
    ]
  }
};

// ---- AIoT Sensor Baseline ----
let aiotTelemetry = {
  soilMoisture: 42.8,  // %
  lux:           12500, // Lux
  pressure:      1013.2, // hPa
  signalRssi:    -62    // dBm
};

// ---- State ----
let currentCityKey = "Taichung";
let prevTemp = 28.5;

// ---- Radial Ring Constants ----
// circumference of r=32: 2π×32 ≈ 201
const RING_CIRCUM = 201;

function setRing(ringEl, pct) {
  if (!ringEl) return;
  const clampedPct = Math.max(0, Math.min(100, pct));
  ringEl.style.strokeDashoffset = RING_CIRCUM - (clampedPct / 100) * RING_CIRCUM;
}

// ---- DOM References ----
const timeEl          = document.getElementById("liveTime");
const dateEl          = document.getElementById("liveDate");
const locTitleEl      = document.getElementById("locationTitle");
const locSubEl        = document.getElementById("locationSubtitle");
const cwIconEl        = document.getElementById("cwIcon");
const cwTempEl        = document.getElementById("cwTemp");
const cwConditionEl   = document.getElementById("cwCondition");
const cwFeelsLikeEl   = document.getElementById("cwFeelsLike");
const valHumidityEl   = document.getElementById("valHumidity");
const valRainEl       = document.getElementById("valRain");
const valWindEl       = document.getElementById("valWind");
const valUvEl         = document.getElementById("valUv");
const humBarEl        = document.getElementById("humBar");
const rainBarEl       = document.getElementById("rainBar");
const uvBarEl         = document.getElementById("uvBar");
const windBarEl       = document.getElementById("windBar");
const forecastListEl  = document.getElementById("forecastList");
const trendCanvas     = document.getElementById("trendChart");
const refreshBtn      = document.getElementById("refreshBtn");
const refreshIconEl   = document.getElementById("refreshIcon");
const apiModalBtn     = document.getElementById("apiModalBtn");
const apiModal        = document.getElementById("apiModal");
const closeModalBtn   = document.getElementById("closeModalBtn");
const cancelModalBtn  = document.getElementById("cancelModalBtn");
const saveApiBtn      = document.getElementById("saveApiBtn");
const apiKeyInput     = document.getElementById("apiKeyInput");
const cityListEl      = document.getElementById("cityList");
const sidebarEl       = document.getElementById("sidebar");
const sidebarToggleEl = document.getElementById("sidebarToggle");

// AIoT Ring / Value refs
const soilRingEl     = document.getElementById("soilRing");
const luxRingEl      = document.getElementById("luxRing");
const pressRingEl    = document.getElementById("pressureRing");
const rssiRingEl     = document.getElementById("rssiRing");
const aiotSoilEl     = document.getElementById("aiotSoil");
const aiotLuxEl      = document.getElementById("aiotLux");
const aiotPressureEl = document.getElementById("aiotPressure");
const aiotRssiEl     = document.getElementById("aiotRssi");

// ---- Live Clock ----
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  if (timeEl) timeEl.textContent = `${h}:${m}:${s}`;
  const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
  if (dateEl) dateEl.textContent =
    `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`;
}

// ---- Temperature Count-Up Animation ----
function animateNumber(from, to, el, decimals = 1, durationMs = 500) {
  if (!el) return;
  const startTime = performance.now();
  function frame(now) {
    const progress = Math.min((now - startTime) / durationMs, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = (from + (to - from) * eased).toFixed(decimals);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---- Render Weather for a City ----
function renderWeather(cityKey) {
  const data = CITY_WEATHER_DATABASE[cityKey] || CITY_WEATHER_DATABASE["Taichung"];

  // Header text
  if (locTitleEl)    locTitleEl.textContent = data.name;
  if (locSubEl)      locSubEl.textContent   = data.district;
  if (cwIconEl)      cwIconEl.textContent   = data.icon;
  if (cwConditionEl) cwConditionEl.textContent = data.condition;
  if (cwFeelsLikeEl) cwFeelsLikeEl.textContent  = `體感 ${data.feelsLike.toFixed(1)}°C`;

  // Animated temperature transition
  animateNumber(prevTemp, data.temp, cwTempEl, 1, 550);
  prevTemp = data.temp;

  // KPI values
  if (valHumidityEl) valHumidityEl.textContent = `${data.humidity}%`;
  if (valRainEl)     valRainEl.textContent      = `${data.rainChance}%`;
  if (valWindEl)     valWindEl.textContent      = data.wind;
  if (valUvEl)       valUvEl.textContent        = data.uvIndex;

  // KPI bar fills
  if (humBarEl)  humBarEl.style.width  = `${data.humidity}%`;
  if (rainBarEl) rainBarEl.style.width = `${data.rainChance}%`;
  if (uvBarEl)   uvBarEl.style.width   = `${data.uvPct}%`;
  if (windBarEl) windBarEl.style.width = `${data.windPct}%`;

  // Sidebar: highlight active city
  document.querySelectorAll(".city-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.city === cityKey);
  });

  // Forecast list
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

  // Redraw chart
  drawTrendChart(data.tempHourly, data.humHourly);
}

// ---- Update AIoT Sensor Telemetry ----
function updateAiotSensors() {
  // Realistic micro-fluctuations
  aiotTelemetry.soilMoisture += (Math.random() - 0.5) * 0.45;
  aiotTelemetry.soilMoisture = Math.max(30, Math.min(85, aiotTelemetry.soilMoisture));

  aiotTelemetry.lux += Math.floor((Math.random() - 0.5) * 220);
  aiotTelemetry.lux = Math.max(800, Math.min(65000, aiotTelemetry.lux));

  aiotTelemetry.pressure += (Math.random() - 0.5) * 0.18;
  aiotTelemetry.pressure = Math.max(990, Math.min(1030, aiotTelemetry.pressure));

  // Soil moisture
  if (aiotSoilEl) aiotSoilEl.textContent = aiotTelemetry.soilMoisture.toFixed(1);
  setRing(soilRingEl, aiotTelemetry.soilMoisture);

  // Light (0–50000 lux mapped to 0–100%)
  if (aiotLuxEl) aiotLuxEl.textContent = aiotTelemetry.lux.toLocaleString();
  setRing(luxRingEl, Math.min(100, Math.round((aiotTelemetry.lux / 50000) * 100)));

  // Pressure (990–1030 hPa mapped to 0–100%)
  if (aiotPressureEl) aiotPressureEl.textContent = aiotTelemetry.pressure.toFixed(1);
  const pressPct = Math.min(100, Math.max(0, ((aiotTelemetry.pressure - 980) / 50) * 100));
  setRing(pressRingEl, pressPct);

  // RSSI (fixed at 85% quality)
  if (aiotRssiEl) aiotRssiEl.textContent = aiotTelemetry.signalRssi;
  setRing(rssiRingEl, 85);
}

// ---- Trend Chart (Native Canvas) ----
function drawTrendChart(tempData, humData) {
  if (!trendCanvas) return;
  const ctx = trendCanvas.getContext("2d");
  const dpr  = window.devicePixelRatio || 1;
  const rect = trendCanvas.getBoundingClientRect();

  trendCanvas.width  = rect.width  * dpr;
  trendCanvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width, H = rect.height;
  const pad = { top: 28, right: 22, bottom: 36, left: 36 };
  const gW  = W - pad.left - pad.right;
  const gH  = H - pad.top  - pad.bottom;
  const n   = tempData.length;

  ctx.clearRect(0, 0, W, H);

  const hours = [
    "02:00", "04:00", "06:00", "08:00", "10:00", "12:00",
    "14:00", "16:00", "18:00", "20:00", "22:00", "24:00"
  ];

  // ── Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (gH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  // ── X-axis labels
  ctx.fillStyle = "#475577";
  ctx.font = "10px 'Inter', sans-serif";
  ctx.textAlign = "center";
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0 || i === n - 1) {
      const x = pad.left + (gW / (n - 1)) * i;
      ctx.fillText(hours[i], x, H - 8);
    }
  }

  // ── Scale helpers
  const getTY = t   => pad.top + gH - ((t   - 18) / (36 - 18)) * gH;
  const getHY = hum => pad.top + gH - ((hum - 40) / (100 - 40)) * gH;

  // ── Bezier curve helper
  const drawBezier = (data, getY) => {
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x  = pad.left + (gW / (n - 1)) * i;
      const y  = getY(data[i]);
      if (i === 0) { ctx.moveTo(x, y); continue; }
      const px = pad.left + (gW / (n - 1)) * (i - 1);
      const py = getY(data[i - 1]);
      const cx = (px + x) / 2;
      ctx.bezierCurveTo(cx, py, cx, y, x, y);
    }
  };

  // ── Humidity line (dashed, emerald)
  drawBezier(humData, getHY);
  ctx.strokeStyle = "rgba(16, 185, 129, 0.72)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Temperature gradient fill
  const tempGrad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
  tempGrad.addColorStop(0, "rgba(56, 189, 248, 0.28)");
  tempGrad.addColorStop(1, "rgba(56, 189, 248, 0.00)");

  drawBezier(tempData, getTY);
  ctx.lineTo(pad.left + gW, pad.top + gH);
  ctx.lineTo(pad.left, pad.top + gH);
  ctx.closePath();
  ctx.fillStyle = tempGrad;
  ctx.fill();

  // ── Temperature line (cyan, glowing)
  drawBezier(tempData, getTY);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(56, 189, 248, 0.55)";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Data points + labels
  for (let i = 0; i < n; i++) {
    const x = pad.left + (gW / (n - 1)) * i;
    const y = getTY(tempData[i]);

    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    if (i % 2 === 0 || i === n - 1) {
      ctx.fillStyle = "#dde6ff";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${tempData[i]}°`, x, y - 9);
    }
  }
}

// ---- Optional: Fetch Real CWA Data ----
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
    console.warn("CWA API 略過或失敗，繼續使用預置資料:", err);
  }
}

// ---- Event Listeners ----

// Sidebar city selection (click delegation)
if (cityListEl) {
  cityListEl.addEventListener("click", e => {
    const item = e.target.closest(".city-item");
    if (!item || !item.dataset.city) return;
    currentCityKey = item.dataset.city;
    renderWeather(currentCityKey);
  });
}

// Refresh button
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    if (refreshIconEl) refreshIconEl.classList.add("spin");
    setTimeout(() => {
      updateAiotSensors();
      renderWeather(currentCityKey);
      if (refreshIconEl) refreshIconEl.classList.remove("spin");
    }, 650);
  });
}

// Mobile sidebar toggle
if (sidebarToggleEl && sidebarEl) {
  sidebarToggleEl.addEventListener("click", () => {
    sidebarEl.classList.toggle("open");
  });
  // Close sidebar when clicking outside
  document.addEventListener("click", e => {
    if (
      sidebarEl.classList.contains("open") &&
      !sidebarEl.contains(e.target) &&
      !sidebarToggleEl.contains(e.target)
    ) {
      sidebarEl.classList.remove("open");
    }
  });
}

// API Modal — open
if (apiModalBtn && apiModal) {
  apiModalBtn.addEventListener("click", () => {
    if (apiKeyInput) apiKeyInput.value = localStorage.getItem("CWA_API_KEY") || "";
    apiModal.classList.add("active");
  });
}
// API Modal — close
if (closeModalBtn && apiModal) {
  closeModalBtn.addEventListener("click", () => apiModal.classList.remove("active"));
}
if (cancelModalBtn && apiModal) {
  cancelModalBtn.addEventListener("click", () => apiModal.classList.remove("active"));
}
// API Modal — save
if (saveApiBtn && apiModal) {
  saveApiBtn.addEventListener("click", () => {
    const val = apiKeyInput ? apiKeyInput.value.trim() : "";
    if (val) {
      localStorage.setItem("CWA_API_KEY", val);
      alert("✅ CWA API 授權碼已儲存！系統將使用即時資料。");
    } else {
      localStorage.removeItem("CWA_API_KEY");
      alert("已清除 API 授權碼，恢復預設展示模式。");
    }
    apiModal.classList.remove("active");
    fetchCwaDataIfKeyAvailable();
  });
}
// Close modal on overlay click
if (apiModal) {
  apiModal.addEventListener("click", e => {
    if (e.target === apiModal) apiModal.classList.remove("active");
  });
}

// Resize → redraw chart
window.addEventListener("resize", () => {
  const data = CITY_WEATHER_DATABASE[currentCityKey];
  if (data) drawTrendChart(data.tempHourly, data.humHourly);
});

// ---- Initialization ----
document.addEventListener("DOMContentLoaded", () => {
  // Start live clock
  updateClock();
  setInterval(updateClock, 1000);

  // Init AIoT sensors + live polling
  updateAiotSensors();
  setInterval(updateAiotSensors, 3500);

  // Render default city
  renderWeather(currentCityKey);

  // Optional CWA API fetch
  fetchCwaDataIfKeyAvailable();
});
