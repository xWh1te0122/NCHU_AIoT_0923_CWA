/* ============================================================
   AIoT CWA GIS — script.js  (Glassmorphism v2, Parallel Load)
   架構：CWA API Service Layer + LayerManager + 4 核心模組
   各圖層獨立載入，互不阻塞
   ============================================================ */

'use strict';

// ============================================================
// 1. CWA API Service Layer
// ============================================================
const cwaApiService = {
    _proxy: '/api/cwa',

    _url(dataset, params = '') {
        return `${this._proxy}/${dataset}${params}`;
    },

    /** F-C0032-001 — 今明 36 小時天氣預報（縣市） */
    async getForecast36h(locationName = '') {
        const loc = locationName ? `?locationName=${encodeURIComponent(locationName)}` : '';
        const res = await fetch(this._url('F-C0032-001', loc));
        return res.json();
    },

    /** E-A0015-001 — 顯著有感地震報告 */
    async getEarthquakes() {
        const res = await fetch(this._url('E-A0015-001', '?limit=3'));
        return res.json();
    },

    /** W-C0033-001 — 特報（颱風、豪雨等） */
    async getWeatherWarnings() {
        const res = await fetch(this._url('W-C0033-001'));
        return res.json();
    }
};

// ============================================================
// 2. 22 Counties Coordinates
// ============================================================
const COORDINATES = {
    '臺北市': [25.0329694, 121.5654177],
    '新北市': [25.017056, 121.462768],
    '基隆市': [25.127603, 121.739183],
    '桃園市': [24.993628, 121.300979],
    '新竹縣': [24.838322, 121.014100],
    '新竹市': [24.813828, 120.967479],
    '苗栗縣': [24.560158, 120.821427],
    '臺中市': [24.147735, 120.673648],
    '彰化縣': [24.051796, 120.539458],
    '南投縣': [23.960823, 120.971864],
    '雲林縣': [23.709203, 120.431337],
    '嘉義縣': [23.451852, 120.255461],
    '嘉義市': [23.480075, 120.449111],
    '臺南市': [22.999728, 120.227027],
    '高雄市': [22.627278, 120.301435],
    '屏東縣': [22.672583, 120.485121],
    '宜蘭縣': [24.730310, 121.758410],
    '花蓮縣': [23.987158, 121.601071],
    '臺東縣': [22.758333, 121.144444],
    '澎湖縣': [23.571089, 119.569974],
    '金門縣': [24.449167, 118.375556],
    '連江縣': [26.151772, 119.946114]
};

// ============================================================
// 3. Layer Manager — 統一管理所有圖層狀態
// ============================================================
const LayerManager = {
    layers: {
        temp:     { active: true,  markers: [], checkboxId: 'layerTemp', useCluster: true },
        pop:      { active: false, markers: [], checkboxId: 'layerPop',  useCluster: true },
        wind:     { active: false, markers: [], checkboxId: 'layerWind', useCluster: false },
        humd:     { active: false, markers: [], checkboxId: 'layerHumd', useCluster: false },
        heat:     { active: false, markers: [], checkboxId: 'layerHeat' },
        debugObs: { active: false, markers: [], checkboxId: 'layerDebugObs' }
    },
    clusterGroups: { temp: null, pop: null },

    getActive(name)      { return this.layers[name]?.active ?? false; },
    setActive(name, val) { if (this.layers[name]) this.layers[name].active = val; },

    clearMarkers(name) {
        const layer = this.layers[name];
        if (!layer) return;
        if (layer.useCluster) {
            const cg = this.clusterGroups[name];
            if (cg) { AppState.map.removeLayer(cg); this.clusterGroups[name] = null; }
        } else if (name === 'wind' || name === 'humd') {
            // wind/humd 存在 obsLayerGroup，清圖層群組即可
            if (AppState.obsLayerGroup) AppState.obsLayerGroup.clearLayers();
        } else {
            layer.markers.forEach(m => AppState.map.removeLayer(m));
        }
        layer.markers = [];
    },

    clearAll() { Object.keys(this.layers).forEach(k => this.clearMarkers(k)); },

    addMarker(name, marker) {
        const layer = this.layers[name];
        if (!layer) return;
        layer.markers.push(marker);
    },

    commitCluster(name) {
        const layer = this.layers[name];
        if (!layer?.useCluster || layer.markers.length === 0) return;
        const cg = L.markerClusterGroup({
            maxClusterRadius: 60,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                const size  = count > 20 ? 48 : count > 10 ? 40 : 34;
                return L.divIcon({
                    html: `<div class="cluster-icon cluster-${name}" style="width:${size}px;height:${size}px;line-height:${size}px;font-size:${size * 0.38}px">${count}</div>`,
                    className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2]
                });
            }
        });
        cg.addLayers(layer.markers);
        cg.addTo(AppState.map);
        this.clusterGroups[name] = cg;
    }
};

// ============================================================
// 4. App State
// ============================================================
const AppState = {
    map: null,
    CartoDark: null,
    OSMStreet: null,
    weatherData:   [],
    forecastCache: {},
    obsData:       [],        // 過濾後的有效測站
    obsDataFiltered: [],      // 風/濕有效的測站子集
    obsFetchedAt:  0,
    alertData:     [],
    alertIndex:    0,
    alertRotation: null,
    alertPolling:  null,
    quakeMarkers:  [],
    taiwanGeom:    null,
    tempIsobands:  null,
    canvasRenderer: null,     // 共用 canvas renderer
    obsLayerGroup:  null,     // 風/濕圖層 LayerGroup（LOD 用）
    _obsRenderScheduled: false // 防抖旗標
};

// ============================================================
// 5. Loading State Manager
// ============================================================
const LoadingState = {
    // Main overlay (地圖中央遮罩)
    showOverlay(text = '載入氣象資料中…') {
        const el = document.getElementById('loader');
        if (!el) return;
        el.querySelector('.loader-text').textContent = text;
        el.style.display = 'flex';
        el.style.opacity = '1';
    },

    hideOverlay() {
        const el = document.getElementById('loader');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => { el.style.display = 'none'; }, 500);
    },

    // Heatmap progress chip (小型進度提示)
    showHeatmapProgress(text) {
        let chip = document.getElementById('heatmap-progress-chip');
        if (!chip) {
            chip = document.createElement('div');
            chip.id = 'heatmap-progress-chip';
            chip.className = 'heatmap-progress-chip';
            document.querySelector('.map-container')?.appendChild(chip);
        }
        chip.innerHTML = `<span class="chip-spinner"></span><span>${text}</span>`;
        chip.style.display = 'flex';
    },

    hideHeatmapProgress() {
        const chip = document.getElementById('heatmap-progress-chip');
        if (chip) chip.style.display = 'none';
    },

    // ── Heatmap toggle 載入禁用 / 啟用 ──
    setHeatToggleLoading() {
        const label = document.querySelector('label[for="layerHeat"]');
        if (!label) return;
        label.classList.add('layer-item--loading');
        label.title = '溫度熱力圖資料計算中，請稍候…';
        // 阻止 checkbox 被點擊（label 雖然視覺上 disabled，但 for 屬性仍有效）
        const cb = document.getElementById('layerHeat');
        if (cb) cb.disabled = true;
    },

    clearHeatToggleLoading() {
        const label = document.querySelector('label[for="layerHeat"]');
        if (!label) return;
        label.classList.remove('layer-item--loading');
        label.title = '';
        const cb = document.getElementById('layerHeat');
        if (cb) cb.disabled = false;
    },

    // Error toast (錯誤提示，可帶重試按鈕)
    showError(message, retryFn = null) {
        let toast = document.getElementById('error-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'error-toast';
            toast.className = 'error-toast';
            document.querySelector('.map-container')?.appendChild(toast);
        }
        const retryBtn = retryFn
            ? `<button class="error-retry-btn" id="error-retry-btn">點此重試</button>`
            : '';
        toast.innerHTML = `<span>⚠️ ${message}</span>${retryBtn}`;
        toast.style.display = 'flex';

        if (retryFn) {
            document.getElementById('error-retry-btn')?.addEventListener('click', () => {
                toast.style.display = 'none';
                retryFn();
            });
        }

        // Auto-hide after 8 seconds if no retry
        if (!retryFn) setTimeout(() => { toast.style.display = 'none'; }, 8000);
    },

    hideError() {
        const toast = document.getElementById('error-toast');
        if (toast) toast.style.display = 'none';
    }
};

// ============================================================
// 6. Utility helpers
// ============================================================
function wxToEmoji(wxStr = '') {
    const s = wxStr.toLowerCase();
    if (s.includes('晴')) return '☀️';
    if (s.includes('多雲') || s.includes('雲'))  return '⛅';
    if (s.includes('陰'))  return '☁️';
    if (s.includes('雷'))  return '⛈️';
    if (s.includes('雨'))  return '🌧️';
    if (s.includes('霧'))  return '🌫️';
    if (s.includes('雪'))  return '❄️';
    return '🌡️';
}

function tempToColor(t) {
    const temp = parseFloat(t);
    if (isNaN(temp)) return '#8ba4c4';
    if (temp >= 36) return '#ef4444';
    if (temp >= 33) return '#f97316';
    if (temp >= 28) return '#f59e0b';
    if (temp >= 24) return '#eab308';
    if (temp >= 18) return '#22d3ee';
    return '#60a5fa';
}

function windToEmoji(dir) {
    const dirs = { 'N':'⬆️','NNE':'↗️','NE':'↗️','ENE':'↗️','E':'➡️','ESE':'↘️','SE':'↘️','SSE':'↘️','S':'⬇️','SSW':'↙️','SW':'↙️','WSW':'↙️','W':'⬅️','WNW':'↖️','NW':'↖️','NNW':'↖️','靜風':'⦿' };
    return dirs[dir] || '💨';
}

function humdToColor(h) {
    const v = parseFloat(h);
    if (isNaN(v)) return 'rgba(129,140,248,0.4)';
    if (v >= 90) return 'rgba(99,102,241,0.8)';
    if (v >= 75) return 'rgba(129,140,248,0.65)';
    if (v >= 60) return 'rgba(165,180,252,0.5)';
    return 'rgba(199,210,254,0.35)';
}

function updateClock() {
    const el = document.getElementById('current-time');
    if (el) el.textContent = new Date().toLocaleString('zh-TW', { hour12: false });
}

function toggleAccordion(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
}

/** 帶 timeout 的 fetch，超過 ms 毫秒視為失敗 */
function fetchWithTimeout(url, options = {}, ms = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
}

// ============================================================
// 7. Init App  ← 重構核心：各圖層平行獨立載入
// ============================================================
async function initApp() {
    updateClock();
    setInterval(updateClock, 1000);

    LoadingState.showOverlay('載入氣象資料中…');

    // ★ IDW 尚未計算完成前，禁止操作熱力圖 toggle
    LoadingState.setHeatToggleLoading();

    try {
        // ── (A) 取得後端 config ──
        console.time('[init] config');
        const cfgRes  = await fetchWithTimeout('/api/config', {}, 10000);
        const cfgJson = await cfgRes.json();
        const cartoKey = cfgJson.carto_api_key || '';
        console.timeEnd('[init] config');

        // ── (B) Init Leaflet map ──
        AppState.CartoDark = L.tileLayer(
            `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`,
            { attribution: '&copy; <a href="https://carto.com/">CartoDB</a>', subdomains: 'abcd', maxZoom: 20 }
        );
        AppState.OSMStreet = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>', maxZoom: 19 }
        );
        // 共用 canvas renderer（所有圓點/向量圖層）
        AppState.canvasRenderer = L.canvas({ padding: 0.5 });

        AppState.map = L.map('map', {
            center: [23.7, 121], zoom: 7.5,
            layers: [AppState.CartoDark],
            zoomControl: false,
            preferCanvas: true
        });
        L.control.zoom({ position: 'bottomright' }).addTo(AppState.map);

        // 風/濕圖層專用 LayerGroup
        AppState.obsLayerGroup = L.layerGroup().addTo(AppState.map);

        // LOD 觸發：moveend / zoomend 時重繪觀測圖層
        AppState.map.on('moveend zoomend', () => {
            const showWind = LayerManager.getActive('wind');
            const showHumd = LayerManager.getActive('humd');
            if (showWind || showHumd) scheduleObsRender(showWind, showHumd);
        });

        setupEventListeners();
        initLegend();

    } catch (err) {
        console.error('[initApp] 初始化失敗', err);
        LoadingState.hideOverlay();
        LoadingState.showError('頁面初始化失敗，請重新整理');
        updateStatusLed('led-api', 'danger');
        document.getElementById('val-api').textContent = '連線失敗';
        return;
    }

    // ── (C) 平行抓取所有資料來源，互不阻塞 ──
    console.time('[init] parallel fetch');
    const [weatherResult, taiwanResult, obsResult] = await Promise.allSettled([
        loadWeatherLayer(),    // /api/weather (SQLite, 最快)
        loadTaiwanGeom(),      // taiwan.json (8MB, 慢)
        loadObservations()     // /api/observations (後端快取版)
    ]);
    console.timeEnd('[init] parallel fetch');

    // ── (D) 啟動警報輪詢（不阻塞主流程） ──
    startAlertPolling();

    // ── (E) 觀測資料 + 台灣邊界都就緒時，計算 IDW ──
    if (obsResult.status === 'fulfilled' && AppState.obsData.length > 0 &&
        AppState.taiwanGeom) {
        await runIDW();
    } else {
        // IDW 無法執行（邊界或觀測資料缺失）→ 仍需解鎖 toggle（讓使用者知道無法使用）
        LoadingState.clearHeatToggleLoading();
    }

    // ── (F) 如果熱力圖已開啟，重新 render ──
    if (LayerManager.getActive('heat') && AppState.tempIsobands) {
        renderHeatLayer();
    }
}

// ── 各圖層獨立載入函式 ──

/** 載入 /api/weather (SQLite) → 立刻畫縣市標籤 */
async function loadWeatherLayer() {
    try {
        console.time('[init] /api/weather');
        const res  = await fetchWithTimeout('/api/weather', {}, 15000);
        const json = await res.json();
        console.timeEnd('[init] /api/weather');

        if (json.status !== 'success') throw new Error(json.message || 'API error');

        AppState.weatherData = json.data;
        updateStatusLed('led-db', 'ok');
        document.getElementById('val-db').textContent = `${json.data.length} 筆`;
        updateStatusLed('led-api', 'ok');
        document.getElementById('val-api').textContent = '連線正常';

        // 縣市標籤資料一到，立刻畫到地圖並移除遮罩
        renderCountyLayer();
        LoadingState.hideOverlay();   // ★ 縣市標籤出現 → 移除遮罩

    } catch (err) {
        console.error('[loadWeatherLayer]', err);
        updateStatusLed('led-db', 'danger');
        document.getElementById('val-db').textContent = '讀取失敗';
        LoadingState.hideOverlay();   // 失敗也要移除遮罩
        LoadingState.showError('預報資料載入失敗', () => loadWeatherLayer());
    }
}

/** 載入台灣邊界 (8MB, 在背景跑，不阻塞縣市標籤) */
async function loadTaiwanGeom() {
    try {
        console.time('[init] taiwan.json');
        const res   = await fetchWithTimeout('/static/taiwan.json', {}, 15000);
        const twGeo = await res.json();
        console.timeEnd('[init] taiwan.json');

        // Fix black holes (inner rings)
        twGeo.features.forEach(f => {
            if (f.geometry.type === 'Polygon') {
                if (f.geometry.coordinates.length > 1) {
                    f.geometry.coordinates = [f.geometry.coordinates[0]];
                }
            } else if (f.geometry.type === 'MultiPolygon') {
                f.geometry.coordinates = f.geometry.coordinates.map(poly =>
                    poly.length > 1 ? [poly[0]] : poly
                );
            }
        });

        console.time('[init] turf.combine');
        const combined = turf.combine(twGeo);
        AppState.taiwanGeom = combined.features[0].geometry;
        console.timeEnd('[init] turf.combine');

    } catch (err) {
        console.error('[loadTaiwanGeom]', err);
        // 台灣邊界載入失敗：IDW 功能不可用，其他圖層不受影響
        LoadingState.showError('台灣邊界資料載入失敗，溫度熱力圖將無法使用');
    }
}

/** 載入觀測資料 (後端快取版 /api/observations) */
async function loadObservations() {
    const OBS_TTL_MS = 10 * 60 * 1000;
    if (AppState.obsData.length > 0 && (Date.now() - AppState.obsFetchedAt) < OBS_TTL_MS) {
        return; // 前端 TTL 快取
    }

    try {
        console.time('[init] /api/observations');
        const res  = await fetchWithTimeout('/api/observations', {}, 15000);
        const json = await res.json();
        console.timeEnd('[init] /api/observations');

        if (json.status !== 'success') throw new Error(json.message || 'API error');

        // 後端已清理，直接使用
        AppState.obsData = json.data;
        AppState.obsFetchedAt = Date.now();
        // 重建風/濕過濾小組
        buildFilteredObsData();

        const withTemp = json.data.filter(s => s.airTemp !== null && s.airTemp !== undefined);
        console.log(`[loadObservations] 測站總數: ${json.count}, 有溫度: ${withTemp.length}, cached: ${json.cached}`);

        // 若風速或濕度圖層已開啟，馬上 render
        const showWind = LayerManager.getActive('wind');
        const showHumd = LayerManager.getActive('humd');
        if (showWind || showHumd) {
            renderObservationLayer(showWind, showHumd);
        }

    } catch (err) {
        console.error('[loadObservations]', err);
        LoadingState.hideHeatmapProgress();
        LoadingState.showError('測站資料載入失敗，點此重試', () => {
            loadObservations().then(() => {
                if (AppState.taiwanGeom) runIDW();
            });
        });
        throw err; // 讓 Promise.allSettled 記錄為 rejected
    }
}

/** 執行 IDW 計算（在 Worker 裡跑，主執行緒不阻塞）
 *  只在 heat 圖層開啟時才顯示進度提示
 */
async function runIDW() {
    if (!AppState.taiwanGeom || !window.turf) return;

    const points = AppState.obsData
        .map(s => {
            const t = s.airTemp !== null && s.airTemp !== undefined ? parseFloat(s.airTemp) : NaN;
            return { s, t };
        })
        .filter(({ t }) => Number.isFinite(t) && t > -90 && t >= -20 && t <= 45)
        .map(({ s, t }) => turf.point([parseFloat(s.lon), parseFloat(s.lat)], { temp: t }));

    if (points.length === 0) return;

    const heatVisible = LayerManager.getActive('heat');
    if (heatVisible) LoadingState.showHeatmapProgress('計算溫度分布…');
    console.time('[init] IDW Worker');

    try {
        await calculateIDW(points);
        console.timeEnd('[init] IDW Worker');
        // ★ IDW 完成 → 解鎖 toggle
        LoadingState.clearHeatToggleLoading();
        if (heatVisible) {
            LoadingState.hideHeatmapProgress();
            renderHeatLayer();
        }
    } catch (err) {
        console.error('[runIDW]', err);
        // ★ 計算失敗也要解鎖（讓使用者可重新嘗試或關閉）
        LoadingState.clearHeatToggleLoading();
        LoadingState.hideHeatmapProgress();
        LoadingState.showError('溫度熱力圖計算失敗', () => runIDW());
    }
}

// ============================================================
// 8. Event Listeners
// ============================================================
function setupEventListeners() {
    const layerIdMap = {
        'layerTemp':     'temp',
        'layerPop':      'pop',
        'layerWind':     'wind',
        'layerHumd':     'humd',
        'layerHeat':     'heat',
        'layerDebugObs': 'debugObs'
    };
    Object.entries(layerIdMap).forEach(([id, layerName]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            // ★ layerHeat：IDW 計算期間 checkbox 已 disabled，
            //   但這裡再加一道保險：tempIsobands 為 null 時不 render
            if (layerName === 'heat' && el.checked && !AppState.tempIsobands) {
                // IDW 還沒算完就被觸發（理論上不該發生，保險用）
                el.checked = false;
                return;
            }
            LayerManager.setActive(layerName, el.checked);
            renderAllLayers();
        });
    });

    document.getElementById('btnDarkMap').addEventListener('click', e => {
        AppState.map.removeLayer(AppState.OSMStreet);
        AppState.map.addLayer(AppState.CartoDark);
        e.target.classList.add('active');
        document.getElementById('btnStreetMap').classList.remove('active');
    });

    document.getElementById('btnStreetMap').addEventListener('click', e => {
        AppState.map.removeLayer(AppState.CartoDark);
        AppState.map.addLayer(AppState.OSMStreet);
        e.target.classList.add('active');
        document.getElementById('btnDarkMap').classList.remove('active');
    });

    document.getElementById('alert-banner').addEventListener('click', e => {
        if (e.target.id === 'alert-close') return;
        openAlertModal();
    });
    document.getElementById('alert-close').addEventListener('click', e => {
        e.stopPropagation();
        hideBanner();
    });
    document.getElementById('alert-modal').addEventListener('click', e => {
        if (e.target === document.getElementById('alert-modal')) closeAlertModal();
    });

    setupSearch();
}

// ── F-11: 快速城市搜尋 ──
function setupSearch() {
    const wrapper     = document.getElementById('custom-city-select');
    const trigger     = wrapper?.querySelector('.custom-select-trigger');
    const textNode    = document.getElementById('custom-select-text');
    const optionsList = document.getElementById('custom-city-options');
    if (!wrapper || !trigger || !optionsList) return;

    Object.keys(COORDINATES).forEach(county => {
        const li = document.createElement('li');
        li.textContent = county;
        li.addEventListener('click', e => {
            e.stopPropagation();
            textNode.textContent = county;
            wrapper.classList.remove('open');
            const coords = COORDINATES[county];
            if (coords) {
                AppState.map.flyTo(coords, 10, { duration: 1.5 });
                const countyData = AppState.weatherData.find(c => c.location_name === county);
                if (countyData) setTimeout(() => openWeatherPopup(countyData, coords), 1500);
            }
            setTimeout(() => { textNode.textContent = '快速移動至縣市...'; }, 2000);
        });
        optionsList.appendChild(li);
    });

    trigger.addEventListener('click', e => { e.stopPropagation(); wrapper.classList.toggle('open'); });
    document.addEventListener('click', e => { if (!wrapper.contains(e.target)) wrapper.classList.remove('open'); });
}

// ============================================================
// 9. Render All Layers
// ============================================================
function renderAllLayers() {
    LayerManager.clearAll();
    // 清除風/濕專用圖層
    if (AppState.obsLayerGroup) AppState.obsLayerGroup.clearLayers();

    const showTemp     = LayerManager.getActive('temp');
    const showPop      = LayerManager.getActive('pop');
    const showWind     = LayerManager.getActive('wind');
    const showHumd     = LayerManager.getActive('humd');
    const showHeat     = LayerManager.getActive('heat');
    const showDebugObs = LayerManager.getActive('debugObs');

    if (showDebugObs) renderDebugObsLayer();

    if (showHeat) renderHeatLayer();

    // 風/濕用新架構直接渲染（不經過 LayerManager.commitCluster）
    if (showWind || showHumd) renderObservationLayer(showWind, showHumd);

    renderCountyLayer();
}

/** 只渲染縣市標籤（Temp / PoP pill markers） */
function renderCountyLayer() {
    // 先清除舊的 temp / pop
    LayerManager.clearMarkers('temp');
    LayerManager.clearMarkers('pop');

    const showTemp = LayerManager.getActive('temp');
    const showPop  = LayerManager.getActive('pop');

    if (!showTemp && !showPop) return;

    AppState.weatherData.forEach(county => {
        const coords = COORDINATES[county.location_name];
        if (!coords) return;
        renderUnifiedCountyMarker(county, coords, showTemp, showPop);
    });

    if (showTemp) LayerManager.commitCluster('temp');
    else if (showPop) LayerManager.commitCluster('pop');
}

/** 只渲染溫度熱力圖圖層 */
function renderHeatLayer() {
    LayerManager.clearMarkers('heat');

    if (!AppState.tempIsobands) return;

    const heatLayer = L.geoJSON(AppState.tempIsobands, {
        renderer: L.canvas({ padding: 0.5 }),
        style: function (feature) {
            const tempStr = feature.properties.tempRange;
            // 無資料區域：半透明灰色
            if (!tempStr || tempStr === 'nodata') {
                return {
                    fillColor: '#64748b',
                    fillOpacity: 0.35,
                    weight: 1,
                    color: 'rgba(100,116,139,0.4)',
                    dashArray: '4 4',
                    stroke: true
                };
            }
            const temp = parseFloat(tempStr.split('-')[0]);
            return {
                fillColor: getIsobandColor(temp),
                fillOpacity: 0.7,
                weight: 0,
                stroke: false
            };
        },
        onEachFeature: function (feature, layer) {
            if (feature.properties.tempRange === 'nodata') {
                layer.bindTooltip('無測站資料', { className: 'obs-tooltip', sticky: true });
            }
        }
    }).addTo(AppState.map);
    LayerManager.addMarker('heat', heatLayer);

    if (AppState.legendControl) AppState.legendControl.addTo(AppState.map);
}

// ── Unified County Pill Marker (Temp & PoP) ──
function renderUnifiedCountyMarker(county, coords, showTemp, showPop) {
    let innerHTML = '';
    const tempColor = county.avg_t ? tempToColor(county.avg_t) : '#6b7280';

    let markerClass = 'pill-marker ';
    markerClass += showTemp ? 'type-temp' : 'type-pop';

    let inlineStyle = '';
    if (showTemp) inlineStyle = `border-color: ${tempColor}40; box-shadow: 0 4px 16px ${tempColor}25;`;

    innerHTML += `<div class="${markerClass}" style="${inlineStyle}" title="${county.location_name}">`;
    if (showTemp) {
        const temp = county.avg_t ? `${county.avg_t}°C` : '--';
        const wxEmoji = wxToEmoji(county.wx || '');
        innerHTML += `<span class="pill-icon">${wxEmoji}</span>`;
        innerHTML += `<span class="pill-title" style="margin-right: 4px;">${county.location_name}</span>`;
        innerHTML += `<span class="pill-unit">${temp}</span>`;
    }
    if (showTemp && showPop) {
        innerHTML += `<div style="width: 1px; height: 12px; background: rgba(255,255,255,0.25); margin: 0 4px;"></div>`;
    }
    if (showPop) {
        const pop = (county.pop_12h && county.pop_12h.trim() !== '') ? `${county.pop_12h}%` : '0%';
        innerHTML += `<span class="pill-icon">💧</span>`;
        if (!showTemp) innerHTML += `<span class="pill-title" style="margin-right: 4px;">${county.location_name}</span>`;
        innerHTML += `<span class="pill-unit">${pop}</span>`;
    }
    innerHTML += `</div>`;

    const anchorX = (showTemp && showPop) ? 80 : 45;
    const icon = L.divIcon({
        className: 'custom-div-icon',
        html: innerHTML,
        iconSize: [null, null],
        iconAnchor: [anchorX, 15]
    });

    const marker = L.marker(coords, { icon });
    marker.on('click', () => openWeatherPopup(county, coords));
    LayerManager.addMarker(showTemp ? 'temp' : 'pop', marker);
}

// ── Weather Popup ──
async function openWeatherPopup(county, coords) {
    const cached    = AppState.forecastCache[county.location_name];
    const cacheValid = cached && (Date.now() - cached._fetchedAt < 5 * 60 * 1000);
    let forecastSlots = cacheValid ? cached.slots : null;

    if (!forecastSlots) {
        forecastSlots = await fetchForecast36h(county.location_name);
        AppState.forecastCache[county.location_name] = { slots: forecastSlots, _fetchedAt: Date.now() };
    }

    const wxEmoji = wxToEmoji(county.wx || '');
    const avgT = county.avg_t ? `${county.avg_t}°C` : '--';
    const maxT = county.max_t ? `${county.max_t}°C` : '--';
    const minT = county.min_t ? `${county.min_t}°C` : '--';
    const pop  = (county.pop_12h && county.pop_12h.trim()) ? `${county.pop_12h}%` : '0%';
    const wx   = county.wx || '--';

    const timelineHTML = forecastSlots.map((slot, i) => `
        <div class="timeline-slot ${i === 0 ? 'active' : ''}">
            <div class="slot-time">${slot.time}</div>
            <div class="slot-wx">${slot.wxEmoji}</div>
            <div class="slot-temp">${slot.maxT}°</div>
            <div class="slot-pop">💧${slot.pop}%</div>
        </div>
    `).join('');

    const popupContent = `
        <div class="weather-popup">
            <div class="popup-header">
                <div class="popup-wx-icon">${wxEmoji}</div>
                <div class="popup-title">
                    <h2>${county.location_name}</h2>
                    <div class="popup-wx-desc">${wx}</div>
                    <div class="popup-temps">
                        <span class="temp-current">${avgT}</span>
                        <span class="temp-range">↑${maxT} ↓${minT}</span>
                    </div>
                </div>
            </div>
            <div class="popup-data-grid">
                <div class="data-chip"><span class="chip-label">降雨機率</span><span class="chip-val pop-val">💧 ${pop}</span></div>
                <div class="data-chip"><span class="chip-label">最高溫</span><span class="chip-val temp-val">🌡️ ${maxT}</span></div>
                <div class="data-chip"><span class="chip-label">最低溫</span><span class="chip-val">${minT}</span></div>
                <div class="data-chip"><span class="chip-label">預報起始</span><span class="chip-val ci-val" style="font-size:0.76rem;" title="此為 CWA 預報資料的起始時間">📅 ${formatForecastTime(county.forecast_start)}</span></div>
            </div>
            ${forecastSlots.length > 0 ? `
            <div class="popup-timeline">
                <div class="timeline-title">📅 未來 ${forecastSlots.length} 時段預報</div>
                <div class="timeline-scroll">${timelineHTML}</div>
            </div>` : ''}
        </div>
    `;

    L.popup({
        className: 'custom-popup',
        offset: [55, 10],
        maxWidth: 340,
        closeButton: true,
        keepInView: true,
        autoPanPaddingTopLeft: L.point(10, 100),
        autoPanPaddingBottomRight: L.point(10, 20)
    })
        .setLatLng(coords)
        .setContent(popupContent)
        .openOn(AppState.map);
}

async function fetchForecast36h(locationName) {
    try {
        const json = await cwaApiService.getForecast36h(locationName);
        if (json.success !== 'true') return [];
        const location = (json.records?.location || []).find(l => l.locationName === locationName);
        if (!location) return [];
        const periods = {};
        (location.weatherElement || []).forEach(elem => {
            const name = elem.elementName;
            (elem.time || []).forEach(t => {
                const key = t.startTime;
                if (!periods[key]) periods[key] = { startTime: key, endTime: t.endTime };
                const val = t.parameter?.parameterName || t.parameter?.parameterValue || '';
                if (name === 'Wx')   periods[key].wx   = val;
                if (name === 'MaxT') periods[key].maxT = val;
                if (name === 'MinT') periods[key].minT = val;
                if (name === 'PoP')  periods[key].pop  = val;
                if (name === 'CI')   periods[key].ci   = val;
            });
        });
        return Object.values(periods).slice(0, 6).map(p => ({
            time: new Date(p.startTime).toLocaleString('zh-TW', { month:'numeric', day:'numeric', hour:'numeric', hour12: false }).replace(' ', '\n'),
            wxEmoji: wxToEmoji(p.wx || ''),
            wx: p.wx || '--',
            maxT: p.maxT || '--',
            minT: p.minT || '--',
            pop: p.pop || '0',
            ci: p.ci || '--'
        }));
    } catch (err) {
        console.warn('[fetchForecast36h]', err);
        return [];
    }
}

function formatForecastTime(dtStr) {
    if (!dtStr) return '--';
    try {
        return new Date(dtStr).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
    } catch { return dtStr; }
}

// ============================================================
// 10. Observation Layer (Wind & Humidity) — LOD Canvas 版
// ============================================================

/** 有效風速：0–80 m/s，有效濕度：0–100 %
 *  預先過濾，結果存入 AppState.obsDataFiltered */
function buildFilteredObsData() {
    AppState.obsDataFiltered = AppState.obsData.filter(stn => {
        const lat = typeof stn.lat === 'number' ? stn.lat : parseFloat(stn.lat);
        const lon = typeof stn.lon === 'number' ? stn.lon : parseFloat(stn.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

        // 風速有效性（允許 null — 可能只有濕度）
        const spd = stn.windSpeed !== null && stn.windSpeed !== undefined ? parseFloat(stn.windSpeed) : NaN;
        const spdOk = isNaN(spd) || (spd >= 0 && spd <= 80);

        // 濕度有效性（允許 null）
        const h = stn.humidity !== null && stn.humidity !== undefined ? parseFloat(stn.humidity) : NaN;
        const humdOk = isNaN(h) || (h >= 0 && h <= 100);

        return spdOk && humdOk;
    }).map(stn => ({
        ...stn,
        lat: typeof stn.lat === 'number' ? stn.lat : parseFloat(stn.lat),
        lon: typeof stn.lon === 'number' ? stn.lon : parseFloat(stn.lon),
        _windSpd: stn.windSpeed !== null && stn.windSpeed !== undefined ? parseFloat(stn.windSpeed) : NaN,
        _humd:    stn.humidity  !== null && stn.humidity  !== undefined ? parseFloat(stn.humidity)  : NaN,
    })).filter(stn => {
        // 二次過濾：排除仍為無效的風速/濕度都無效的站
        const hasWind = Number.isFinite(stn._windSpd) && stn._windSpd >= 0 && stn._windSpd <= 80;
        const hasHumd = Number.isFinite(stn._humd)    && stn._humd    >= 0 && stn._humd    <= 100;
        return hasWind || hasHumd;
    });
    console.log(`[obs] 有效測站: ${AppState.obsDataFiltered.length} / ${AppState.obsData.length}`);
}

/** 防抖包裝，避免 moveend/zoomend 高頻觸發 */
function scheduleObsRender(showWind, showHumd) {
    if (AppState._obsRenderScheduled) return;
    AppState._obsRenderScheduled = true;
    requestAnimationFrame(() => {
        AppState._obsRenderScheduled = false;
        renderObservationLayer(showWind, showHumd);
    });
}

/** 主渲染函式 — LOD：
 *  zoom ≤ 9 → canvas circleMarker 圓點（全台）
 *  zoom ≥ 10 → 視窗內合併 divIcon 標籤 + 碰撞迴避 + 超限改圓點
 */
function renderObservationLayer(showWind, showHumd) {
    // 清除舊圖層
    if (AppState.obsLayerGroup) AppState.obsLayerGroup.clearLayers();
    LayerManager.layers.wind.markers = [];
    LayerManager.layers.humd.markers = [];

    if (!showWind && !showHumd) return;
    if (AppState.obsDataFiltered.length === 0) buildFilteredObsData();
    const data = AppState.obsDataFiltered;
    if (data.length === 0) return;

    const zoom = AppState.map.getZoom();
    const renderer = AppState.canvasRenderer;

    if (zoom <= 9) {
        // ── 低縮放：所有站只畫一個有顏色的 canvas 圓點 ──
        data.forEach(stn => {
            let color = '#64748b';
            let tooltipParts = [`<b>${stn.stationName}</b>`];

            if (showHumd && Number.isFinite(stn._humd)) {
                // 濕度決定顏色
                const h = stn._humd;
                if      (h >= 90) color = 'rgba(99,102,241,0.95)';
                else if (h >= 75) color = 'rgba(129,140,248,0.85)';
                else if (h >= 60) color = 'rgba(165,180,252,0.75)';
                else              color = 'rgba(199,210,254,0.65)';
                tooltipParts.push(`濕度: ${h.toFixed(0)}%`);
            }
            if (showWind && Number.isFinite(stn._windSpd)) {
                // 風速用冷暖色（平靜→藍，強風→橙紅）
                const spd = stn._windSpd;
                if (!showHumd) {
                    if      (spd >= 15) color = '#ef4444';
                    else if (spd >= 10) color = '#f97316';
                    else if (spd >= 6)  color = '#facc15';
                    else if (spd >= 3)  color = '#4ade80';
                    else                color = '#60a5fa';
                }
                tooltipParts.push(`風速: ${spd.toFixed(1)} m/s`);
                if (stn.windDir) tooltipParts.push(`風向: ${stn.windDir}`);
            }

            const cm = L.circleMarker([stn.lat, stn.lon], {
                renderer,
                radius: 4,
                color: 'rgba(255,255,255,0.5)',
                weight: 0.8,
                fillColor: color,
                fillOpacity: 0.9
            });
            cm.bindTooltip(tooltipParts.join('<br>'), { className: 'obs-tooltip', sticky: true });
            AppState.obsLayerGroup.addLayer(cm);
        });

    } else {
        // ── 高縮放：視窗篩選 + 碰撞迴避 + 合併標籤 ──
        const bounds = AppState.map.getBounds();
        const inView = data.filter(stn => bounds.contains([stn.lat, stn.lon]));

        // 螢幕座標碰撞迴避
        const LABEL_W = showWind && showHumd ? 110 : 70; // 估計寬度(px)
        const LABEL_H = 24;
        const MAX_LABELS = 80;
        const placed = [];   // { x, y, w, h }
        let labelCount = 0;

        inView.forEach(stn => {
            const pt = AppState.map.latLngToContainerPoint([stn.lat, stn.lon]);
            const px = pt.x, py = pt.y;

            // 建立標籤文字內容
            let windTxt = '', humdTxt = '';
            if (showWind && Number.isFinite(stn._windSpd)) {
                windTxt = `${windToEmoji(stn.windDir)}${stn._windSpd.toFixed(1)}<small>m/s</small>`;
            }
            if (showHumd && Number.isFinite(stn._humd)) {
                humdTxt = `💧${stn._humd.toFixed(0)}<small>%</small>`;
            }

            const hasLabel = (showWind && windTxt) || (showHumd && humdTxt);

            if (hasLabel && labelCount < MAX_LABELS) {
                // 檢查是否與已放置標籤重疊
                const nx = px - LABEL_W / 2, ny = py - LABEL_H / 2;
                const overlap = placed.some(p =>
                    nx < p.x + p.w && nx + LABEL_W > p.x &&
                    ny < p.y + p.h && ny + LABEL_H > p.y
                );

                if (!overlap) {
                    placed.push({ x: nx, y: ny, w: LABEL_W, h: LABEL_H });
                    labelCount++;

                    // 合併風速+濕度成一個標籤
                    const parts = [windTxt, humdTxt].filter(Boolean);
                    const html = `<div class="obs-label">${parts.join('<span class="obs-sep">|</span>')}</div>`;
                    const icon = L.divIcon({
                        className: 'obs-label-wrap',
                        html,
                        iconSize: [LABEL_W, LABEL_H],
                        iconAnchor: [LABEL_W / 2, LABEL_H / 2]
                    });
                    const m = L.marker([stn.lat, stn.lon], { icon });

                    const tt = [`<b>${stn.stationName}</b>`];
                    if (showWind)  {
                        if (Number.isFinite(stn._windSpd)) tt.push(`風速: ${stn._windSpd.toFixed(1)} m/s`);
                        if (stn.windDir) tt.push(`風向: ${stn.windDir}`);
                    }
                    if (showHumd && Number.isFinite(stn._humd)) tt.push(`濕度: ${stn._humd.toFixed(0)}%`);
                    m.bindTooltip(tt.join('<br>'), { className: 'obs-tooltip' });
                    AppState.obsLayerGroup.addLayer(m);
                    return;
                }
            }

            // 重疊或超限 → 改畫小圓點
            let dotColor = '#64748b';
            if (showHumd && Number.isFinite(stn._humd)) {
                const h = stn._humd;
                if      (h >= 90) dotColor = 'rgba(99,102,241,0.95)';
                else if (h >= 75) dotColor = 'rgba(129,140,248,0.85)';
                else if (h >= 60) dotColor = 'rgba(165,180,252,0.75)';
                else              dotColor = 'rgba(199,210,254,0.65)';
            } else if (showWind && Number.isFinite(stn._windSpd)) {
                const spd = stn._windSpd;
                if      (spd >= 15) dotColor = '#ef4444';
                else if (spd >= 10) dotColor = '#f97316';
                else if (spd >= 6)  dotColor = '#facc15';
                else if (spd >= 3)  dotColor = '#4ade80';
                else                dotColor = '#60a5fa';
            }
            const cm = L.circleMarker([stn.lat, stn.lon], {
                renderer,
                radius: 3,
                color: 'rgba(255,255,255,0.4)',
                weight: 0.5,
                fillColor: dotColor,
                fillOpacity: 0.8
            });
            const tt2 = [`<b>${stn.stationName}</b>`];
            if (showWind && Number.isFinite(stn._windSpd)) tt2.push(`風速: ${stn._windSpd.toFixed(1)} m/s`);
            if (showHumd && Number.isFinite(stn._humd))    tt2.push(`濕度: ${stn._humd.toFixed(0)}%`);
            cm.bindTooltip(tt2.join('<br>'), { className: 'obs-tooltip', sticky: true });
            AppState.obsLayerGroup.addLayer(cm);
        });
    }
}

// ── DEBUG: 測站觀測點圖層 ──
function renderDebugObsLayer() {
    const layer = LayerManager.layers.debugObs;
    layer.markers.forEach(m => AppState.map.removeLayer(m));
    layer.markers = [];

    AppState.obsData.forEach(stn => {
        const lat = parseFloat(stn.lat);
        const lon = parseFloat(stn.lon);
        const t   = stn.airTemp !== null && stn.airTemp !== undefined ? parseFloat(stn.airTemp) : NaN;
        if (isNaN(lat) || isNaN(lon)) return;

        const color  = Number.isFinite(t) ? getIsobandColor(t) : '#6b7280';
        const tempTxt = Number.isFinite(t) ? `${t.toFixed(1)}°C` : 'N/A';
        const altTxt  = stn.altitude != null ? `${stn.altitude}m` : '?m';

        const cm = L.circleMarker([lat, lon], { radius: 5, color: '#fff', weight: 1, fillColor: color, fillOpacity: 0.9 });
        cm.bindTooltip(`<b>${stn.stationName}</b><br>海拔: ${altTxt}<br>溫度: ${tempTxt}`, { className: 'obs-tooltip', sticky: true });
        cm.addTo(AppState.map);
        layer.markers.push(cm);
    });
}

// ============================================================
// 11. handleRefresh — 也套用載入狀態，避免重複觸發
// ============================================================
async function handleRefresh() {
    const btn = document.getElementById('btn-refresh');
    if (btn.disabled) return;

    btn.classList.add('spinning');
    btn.disabled = true;

    LoadingState.showOverlay('更新氣象資料中…');
    LoadingState.hideError();

    try {
        // 重置前端快取，強制重抓
        AppState.obsData = [];
        AppState.obsFetchedAt = 0;
        AppState.tempIsobands = null;

        const [weatherResult, obsResult] = await Promise.allSettled([
            loadWeatherLayer(),
            loadObservations()
        ]);

        await pollAlerts();

        if (obsResult.status === 'fulfilled' && AppState.obsData.length > 0 && AppState.taiwanGeom) {
            await runIDW();
        }

        renderAllLayers();

    } catch (err) {
        console.error('[handleRefresh]', err);
    } finally {
        setTimeout(() => {
            btn.classList.remove('spinning');
            btn.disabled = false;
        }, 800);
    }
}

function updateStatusLed(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `status-led led-${state}`;
}

// ============================================================
// 12. Alert Polling (Earthquakes + Weather Warnings)
// ============================================================
function startAlertPolling() {
    pollAlerts();
    AppState.alertPolling = setInterval(pollAlerts, 5 * 60 * 1000);
}

async function pollAlerts() {
    updateStatusLed('led-alert', 'ok');
    document.getElementById('val-alert').textContent = '監測中';

    try {
        const [quakeJson, warningJson] = await Promise.allSettled([
            cwaApiService.getEarthquakes(),
            cwaApiService.getWeatherWarnings()
        ]);

        const alerts = [];

        if (quakeJson.status === 'fulfilled' && quakeJson.value.success === 'true') {
            const eqs = quakeJson.value.records?.Earthquake || [];
            eqs.forEach(eq => {
                const info  = eq.EarthquakeInfo || {};
                const mag   = info.EarthquakeMagnitude?.MagnitudeValue || '?';
                const loc   = info.Epicenter?.Location || '';
                const depth = info.FocalDepth || '?';
                const time  = info.OriginTime || '';
                const eqLat = info.Epicenter?.EpicenterLatitude;
                const eqLon = info.Epicenter?.EpicenterLongitude;
                alerts.push({
                    type: 'quake', title: `🔴 地震報告 M${mag}`,
                    text: `震央：${loc}，深度：${depth} km，時間：${time}`,
                    icon: '🌍',
                    body: `地震規模 M${mag}，震源深度 ${depth} 公里，震央位於 ${loc}。\n\n資料時間：${time}`,
                    time, lat: eqLat, lon: eqLon, mag
                });
            });
        }

        if (warningJson.status === 'fulfilled' && warningJson.value.success === 'true') {
            const recs = warningJson.value.records?.record || [];
            recs.forEach(rec => {
                const hazard  = rec.datasetDescription || '天氣特報';
                const content = rec.phenomena || rec.significance || '';
                const areas   = (rec.locationNameAffected || []).join('、') || '多縣市';
                if (content || areas) {
                    alerts.push({
                        type: 'weather', title: `⚠️ ${hazard}`,
                        text: `影響範圍：${areas} — ${content}`,
                        icon: '⛈️',
                        body: `${hazard}\n影響地區：${areas}\n${content}`,
                        time: rec.startTime || ''
                    });
                }
            });
        }

        AppState.alertData = alerts;

        AppState.quakeMarkers.forEach(m => AppState.map.removeLayer(m));
        AppState.quakeMarkers = [];
        alerts.filter(a => a.type === 'quake' && a.lat && a.lon).forEach(quake => {
            const mVal = parseFloat(quake.mag) || 5.0;
            const size = Math.max(50, mVal * 15);
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="quake-epicenter" style="width:${size}px; height:${size}px;">
                         <div class="quake-ring"></div>
                         <div class="quake-dot"></div>
                       </div>`,
                iconSize: [size, size], iconAnchor: [size / 2, size / 2]
            });
            const m = L.marker([quake.lat, quake.lon], { icon }).addTo(AppState.map);
            m.bindTooltip(`<b>${quake.title}</b><br>${quake.text}`, { className: 'quake-tooltip' });
            AppState.quakeMarkers.push(m);
        });

        if (alerts.length > 0) {
            startAlertRotation();
            updateStatusLed('led-alert', 'danger');
            document.getElementById('val-alert').textContent = `${alerts.length} 則警報`;
            document.getElementById('badge-status').textContent = `${alerts.length} 則警報`;
            document.getElementById('badge-status').className = 'accordion-badge badge-danger';
        } else {
            stopAlertRotation();
            hideBanner();
            document.getElementById('badge-status').textContent = '正常';
            document.getElementById('badge-status').className = 'accordion-badge badge-ok';
        }

    } catch (err) {
        console.error('[pollAlerts]', err);
    }
}

// ============================================================
// 13. Temperature Spatial Interpolation (IDW)
// ============================================================
function getIsobandColor(temp) {
    const stops = [
        { t: 10, c: [49, 54, 149] },
        { t: 15, c: [69, 117, 180] },
        { t: 20, c: [116, 173, 209] },
        { t: 25, c: [254, 224, 144] },
        { t: 30, c: [244, 109, 67] },
        { t: 35, c: [165, 0, 38] }
    ];
    if (temp <= stops[0].t) return `rgb(${stops[0].c.join(',')})`;
    if (temp >= stops[stops.length-1].t) return `rgb(${stops[stops.length-1].c.join(',')})`;
    for (let i = 0; i < stops.length - 1; i++) {
        if (temp >= stops[i].t && temp < stops[i+1].t) {
            const r = (temp - stops[i].t) / (stops[i+1].t - stops[i].t);
            const c1 = stops[i].c, c2 = stops[i+1].c;
            return `rgb(${c1.map((c, idx) => Math.round(c + (c2[idx] - c) * r)).join(',')})`;
        }
    }
}

let idwWorker = null;

/** IDW 計算，接受 turf point 陣列，回傳 Promise
 *  分區策略：本島+澎湖、金門、連江（含東引）、綠島、蘭嶼各自獨立 IDW
 */
function calculateIDW(points) {
    return new Promise((resolve, reject) => {
        // 每次計算前重建 Worker，避免舊訊息污染
        if (idwWorker) {
            idwWorker.terminate();
            idwWorker = null;
        }

        const workerCode = `
            importScripts('https://unpkg.com/@turf/turf@6.5.0/turf.min.js');

            // ── 對一批格點做 IDW，k 個最近鄰 ──
            function applyIDW(gridFeatures, pts, k) {
                gridFeatures.forEach(function(gridPt) {
                    var sumW = 0, sumTW = 0, exact = false, exactT = 0;
                    var gc = gridPt.geometry.coordinates;
                    var dists = pts.map(function(p) {
                        var pc = p.geometry.coordinates;
                        var dx = pc[0] - gc[0], dy = pc[1] - gc[1];
                        return { temp: p.properties.temp, d2: dx*dx + dy*dy };
                    });
                    dists.sort(function(a,b){ return a.d2 - b.d2; });
                    var kk = Math.min(k, dists.length);
                    for (var i = 0; i < kk; i++) {
                        var d2 = dists[i].d2;
                        if (d2 < 1e-10) { exact = true; exactT = dists[i].temp; break; }
                        var w = 1.0 / d2;
                        sumW += w; sumTW += dists[i].temp * w;
                    }
                    gridPt.properties.temp = exact ? exactT : (sumTW / sumW);
                });
            }

            // ── 對一個區域做完整 IDW + isobands + intersect ──
            // 回傳裁切後的 features 陣列（tempRange 屬性）
            // zonePts: 該區 turf.point[]，zoneGeom: 裁切用幾何，bbox: [minLon,minLat,maxLon,maxLat]
            // cellKm: 格點間距(km)，globalBreaks: 共用 breaks 陣列，k: 最近鄰數
            function processZone(zonePts, zoneGeom, bbox, cellKm, globalBreaks, k) {
                var clipped = [];

                if (zonePts.length === 0) {
                    // 無資料：建立半透明灰色填滿整個邊界
                    var grayFeature = { type: 'Feature', geometry: zoneGeom, properties: { tempRange: 'nodata' } };
                    clipped.push(grayFeature);
                    return clipped;
                }

                if (zonePts.length === 1) {
                    // 只有 1 站：整區塗單一溫度
                    var t = zonePts[0].properties.temp;
                    // 找到對應的 break 區段
                    var band = Math.floor(t);
                    var rangeStr = band + '-' + (band+1);
                    var solidFeature = { type: 'Feature', geometry: zoneGeom, properties: { tempRange: rangeStr } };
                    clipped.push(solidFeature);
                    return clipped;
                }

                // 2 站以上：正常 IDW
                var grid = turf.pointGrid(bbox, cellKm, { units: 'kilometers' });
                applyIDW(grid.features, zonePts, k);

                var isobands;
                try {
                    isobands = turf.isobands(grid, globalBreaks, { zProperty: 'temp' });
                } catch(e) {
                    console.warn('[IDW Worker] isobands 失敗: ' + e.message);
                    return clipped;
                }

                isobands.features.forEach(function(band) {
                    var tempRange = band.properties.temp;
                    try {
                        var c = turf.intersect(band, zoneGeom);
                        if (c) { c.properties = { tempRange: tempRange }; clipped.push(c); }
                    } catch(e) {
                        console.warn('[IDW Worker] intersect 失敗 band=' + JSON.stringify(tempRange) + ': ' + e.message);
                    }
                });

                return clipped;
            }

            // ── 從 taiwanGeom（MultiPolygon）提取落在 bbox 內的子多邊形 ──
            function extractSubGeom(taiwanGeom, bbox) {
                var minLon = bbox[0], minLat = bbox[1], maxLon = bbox[2], maxLat = bbox[3];
                // 找出 centroid 落在 bbox 內的子 polygon
                var subPolys = [];
                if (taiwanGeom.type === 'Polygon') {
                    var c = turf.centroid({ type: 'Feature', geometry: taiwanGeom }).geometry.coordinates;
                    if (c[0] >= minLon && c[0] <= maxLon && c[1] >= minLat && c[1] <= maxLat) {
                        subPolys.push(taiwanGeom.coordinates);
                    }
                } else if (taiwanGeom.type === 'MultiPolygon') {
                    taiwanGeom.coordinates.forEach(function(polyCoords) {
                        var poly = { type: 'Feature', geometry: { type: 'Polygon', coordinates: polyCoords } };
                        var c = turf.centroid(poly).geometry.coordinates;
                        if (c[0] >= minLon && c[0] <= maxLon && c[1] >= minLat && c[1] <= maxLat) {
                            subPolys.push(polyCoords);
                        }
                    });
                }
                if (subPolys.length === 0) return null;
                if (subPolys.length === 1) return { type: 'Polygon', coordinates: subPolys[0] };
                return { type: 'MultiPolygon', coordinates: subPolys };
            }

            self.onmessage = function(e) {
                var allPts    = e.data.points;
                var twGeom    = e.data.taiwanGeom;

                try {
                    // ─── 計算全域溫度 breaks（所有測站共用，確保色階一致） ───
                    var allTemps = allPts.map(function(p){ return p.properties.temp; });
                    var globalMinT = Math.floor(Math.min.apply(null, allTemps)) - 2;
                    var globalMaxT = Math.ceil(Math.max.apply(null, allTemps)) + 2;
                    var globalBreaks = [];
                    for (var b = globalMinT; b <= globalMaxT; b++) globalBreaks.push(b);

                    // ─── 區域定義 ───────────────────────────────────────────
                    // 格式：{ name, lonMin, lonMax, latMin, latMax, pad, cellKm, k }
                    var ZONES = [
                        // 本島 + 澎湖（過濾掉金門/連江/東引經度範圍）
                        { name: '本島',     lonMin: 119.3, lonMax: 122.1, latMin: 21.8, latMax: 25.4, pad: 0.1, cellKm: 2.5, k: 12 },
                        // 金門
                        { name: '金門',     lonMin: 118.1, lonMax: 118.55, latMin: 24.3, latMax: 24.6, pad: 0.05, cellKm: 1.0, k: 5 },
                        // 連江南（南竿、北竿、東莒、西莒）
                        { name: '連江南',   lonMin: 119.8, lonMax: 120.1,  latMin: 25.9, latMax: 26.3, pad: 0.05, cellKm: 1.0, k: 5 },
                        // 東引（獨立小島，lon≈120.48）
                        { name: '東引',     lonMin: 120.42, lonMax: 120.55, latMin: 26.3, latMax: 26.42, pad: 0.05, cellKm: 0.5, k: 3 },
                        // 綠島
                        { name: '綠島',     lonMin: 121.43, lonMax: 121.55, latMin: 22.62, latMax: 22.72, pad: 0.05, cellKm: 0.8, k: 5 },
                        // 蘭嶼
                        { name: '蘭嶼',     lonMin: 121.48, lonMax: 121.59, latMin: 22.01, latMax: 22.10, pad: 0.05, cellKm: 0.5, k: 5 }
                    ];

                    var allClipped = [];

                    ZONES.forEach(function(zone) {
                        // 取出落在此區的測站
                        var zonePts = allPts.filter(function(p) {
                            var c = p.geometry.coordinates;
                            return c[0] >= zone.lonMin && c[0] <= zone.lonMax &&
                                   c[1] >= zone.latMin && c[1] <= zone.latMax;
                        });

                        // 本島額外排除金門/連江/東引的測站（避免跨區污染）
                        if (zone.name === '本島') {
                            zonePts = zonePts.filter(function(p) {
                                var c = p.geometry.coordinates;
                                // 排除金門 lon<119
                                if (c[0] < 119.0) return false;
                                // 排除連江南 lon 119.8~120.1 + lat>25.8
                                if (c[0] >= 119.8 && c[0] <= 120.1 && c[1] > 25.8) return false;
                                // 排除東引 lon>120.4 + lat>26.2
                                if (c[0] > 120.4 && c[1] > 26.2) return false;
                                return true;
                            });
                        }

                        console.warn('[IDW Worker] 區域=' + zone.name + ' 測站=' + zonePts.length);

                        // 提取此區域在台灣 GeoJSON 中對應的幾何（用於 intersect）
                        var searchBbox = [zone.lonMin - zone.pad * 2, zone.latMin - zone.pad * 2,
                                          zone.lonMax + zone.pad * 2, zone.latMax + zone.pad * 2];
                        var zoneGeom = extractSubGeom(twGeom, searchBbox);

                        if (!zoneGeom) {
                            console.warn('[IDW Worker] 找不到 ' + zone.name + ' 的邊界幾何，跳過');
                            return;
                        }

                        // IDW bbox（比測站邊界稍大）
                        var idwBbox = [zone.lonMin - zone.pad, zone.latMin - zone.pad,
                                       zone.lonMax + zone.pad, zone.latMax + zone.pad];

                        var features = processZone(zonePts, zoneGeom, idwBbox, zone.cellKm, globalBreaks, zone.k);
                        features.forEach(function(f){ allClipped.push(f); });
                    });

                    self.postMessage({ status: 'success', isobands: { type: 'FeatureCollection', features: allClipped } });
                } catch (err) {
                    self.postMessage({ status: 'error', message: err.toString() });
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        idwWorker = new Worker(URL.createObjectURL(blob));

        idwWorker.onmessage = (e) => {
            if (e.data.status === 'success') {
                AppState.tempIsobands = e.data.isobands;
                resolve();
            } else {
                console.error('IDW Worker Error:', e.data.message);
                reject(new Error(e.data.message));
            }
        };
        idwWorker.onerror = (err) => {
            console.error('IDW Worker execution error:', err);
            reject(err);
        };
        idwWorker.postMessage({ points, taiwanGeom: AppState.taiwanGeom });
    });
}

function initLegend() {
    AppState.legendControl = L.control({ position: 'bottomright' });
    AppState.legendControl.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.cssText = 'background:rgba(15,23,42,0.85);backdrop-filter:blur(12px);padding:10px 15px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;font-size:13px;line-height:1.8;min-width:220px;';
        const grades = [10, 15, 20, 25, 30, 35];
        div.innerHTML = '<div style="margin-bottom:6px;font-weight:600;color:#fff;">溫度 (°C)</div>';
        const gradientCss = 'linear-gradient(to right, ' + grades.map(g => getIsobandColor(g)).join(', ') + ')';
        div.innerHTML += '<div style="width:100%;height:12px;background:' + gradientCss + ';border-radius:6px;margin-bottom:20px;position:relative;">' +
            grades.map(v => {
                const pct = Math.max(0, Math.min(100, (v - 10) / 25 * 100));
                const label = v === 35 ? '35+' : v;
                return `<span style="position:absolute;left:${pct}%;top:16px;transform:translateX(-50%);font-size:11px;color:#a0aec0;white-space:nowrap;">${label}</span>`;
            }).join('') + '</div>';
        return div;
    };
}

// ============================================================
// 14. Alert rotation / banner
// ============================================================
function startAlertRotation() {
    stopAlertRotation();
    AppState.alertIndex = 0;
    showBanner(AppState.alertData[0]);
    if (AppState.alertData.length > 1) {
        AppState.alertRotation = setInterval(() => {
            AppState.alertIndex = (AppState.alertIndex + 1) % AppState.alertData.length;
            const a = AppState.alertData[AppState.alertIndex];
            const banner = document.getElementById('alert-banner');
            banner.style.opacity = '0';
            setTimeout(() => { showBanner(a); banner.style.opacity = ''; }, 280);
        }, 6000);
    }
}

function stopAlertRotation() {
    if (AppState.alertRotation) { clearInterval(AppState.alertRotation); AppState.alertRotation = null; }
    AppState.alertIndex = 0;
}

function showBanner(alert) {
    const banner = document.getElementById('alert-banner');
    const dot    = document.getElementById('alert-dot');
    banner.className = alert.type === 'quake' ? 'visible alert-quake' : 'visible alert-weather';
    dot.className    = `alert-dot ${alert.type === 'quake' ? 'red' : 'amber'}`;
    document.getElementById('alert-icon').textContent  = alert.icon;
    document.getElementById('alert-title').textContent = alert.title;
    document.getElementById('alert-text').textContent  = alert.text;
}

function hideBanner() {
    stopAlertRotation();
    document.getElementById('alert-banner').className = '';
}

function openAlertModal() {
    if (AppState.alertData.length === 0) return;
    const listHtml = AppState.alertData.map(a => `
        <div class="alert-list-item ${a.type}">
            <div class="alert-item-header">
                <span class="alert-item-icon">${a.icon}</span>
                <div class="alert-item-title-group">
                    <div class="alert-item-title">${a.title}</div>
                    <div class="alert-item-time">${a.time}</div>
                </div>
            </div>
            <div class="alert-item-body">${a.body.replace(/\n/g, '<br>')}</div>
        </div>
    `).join('');
    document.getElementById('modal-body-list').innerHTML = listHtml;
    document.getElementById('alert-modal').classList.add('open');
}

function closeAlertModal() {
    document.getElementById('alert-modal').classList.remove('open');
}

// ============================================================
// 15. Init
// ============================================================
window.addEventListener('load', initApp);
