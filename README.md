# 🌤️ NCHU AIoT × CWA 智慧氣象監控儀表板
## AIoT 課程作業 — CWA HW1

> **CWA Open Data → Database → Taiwan GIS → GitHub → Vercel**

*「技術可以解決問題，但更重要的是用技術創造更好的未來！」—— 煥哥*

本作業以中央氣象署（CWA）真實 Open Data 為資料來源，從 API 資料取得開始，經過 ETL 與 SQLite 儲存，再建立本機 Taiwan GIS Web，最後推送 GitHub 並由 Vercel 自動部署。

---

## 五大 Gate — 進度追蹤

| Gate | 主題 | 狀態 | 備註 |
|---|---|---|---|
| 1 | CWA API | ✅ **PASS** | F-D0047-091, 22縣市, 7天, T/MaxT/MinT/Wx/PoP 全驗證 |
| 2 | Database | ✅ **PASS** | 成功載入 SQLite (data.db)，330筆預報資料 |
| 3 | Taiwan GIS Web | ✅ **PASS** | Flask + Custom Leaflet Glassmorphism UI (server.py) |
| 4 | GitHub | ✅ **PASS** | 原始碼與配置全數推送至 GitHub `main` |
| 5 | Vercel | ✅ **PASS** | 設定 `vercel.json` 與 `api/index.py` 無伺服器連接配置 |

---

## 核心流程

```text
CWA Government Open Data
        ↓
   ┌──────────────────────────────────────────────────┐
   │  預報資料 (F-D0047-091)       即時觀測 (O-A0001-001)
   │  REST API → JSON → ETL        collector.py
   │  weather_forecasts 資料表     stations / observations 資料表
   └──────────────────────────────────────────────────┘
                        ↓
                 SQLite (data.db)
                        ↓
                Backend API (Flask server.py)
                  ├── /api/weather               — 縣市預報（最近時段）
                  ├── /api/weather/all            — 縣市全時段預報
                  ├── /api/observations           — 各站最新觀測（快取版）
                  ├── /api/stations/<id>/history  — 測站歷史資料
                  ├── /api/system/collector-status — 收集器狀態
                  └── /api/cwa/<dataset>          — CWA Proxy
                        ↓
            Taiwan GIS Web (Leaflet + OpenStreetMap)
                        ↓
                    GitHub
                        ↓
                    Vercel
                        ↓
                 Public Website
```

---

## Gate 1 — CWA API ✅ PASS

**驗證日期：** 2026-09-29  
**Dataset：** `F-D0047-091`（全臺縣市7天天氣預報）  

**實際 JSON Schema：**
```text
records.Locations[0].Location[]
  └── LocationName
  └── WeatherElement[]
        ├── 平均溫度   (T)   — 14 periods × 12hr = 7 days
        ├── 最高溫度   (MaxT)
        ├── 最低溫度   (MinT)
        ├── 天氣現象   (Wx)
        └── 12小時降雨機率 (PoP)
```

**Gate 1 PASS Checklist：**
```text
[PASS] Dataset = F-D0047-091
[PASS] CWA authentication success
[PASS] HTTP 200 OK, success = true
[PASS] Real JSON received
[PASS] Actual JSON schema inspected
[PASS] 7-day forecast confirmed
[PASS] T / MaxT / MinT / Wx / PoP all confirmed
[PASS] 22/22 Taiwan counties coverage confirmed
[PASS] No mock/fake data
[PASS] No API Key exposed
```

**Output：** `gate1_output.json` (22 counties, no secrets)

---

## Gate 2 — Database ✅ PASS

**資料庫檔案：** `data.db` (SQLite, WAL 模式)  
**資料表：** `weather_forecasts` / `stations` / `observations`

已將 Gate 1 的真實 CWA JSON 做 ETL 處理。
設計 Duplicate Strategy 採用 `UNIQUE(location_name, forecast_start)` 與 `INSERT OR REPLACE` 策略。

另額外建立自動氣象站觀測資料表（由 `collector.py` 維護）：
- `stations`：測站基本資料（站號、名稱、縣市、鄉鎮、經緯度、海拔）
- `observations`：即時觀測記錄（氣溫、濕度、風速、風向、氣壓、降雨量），以 `(station_id, obs_time)` 為主鍵去重，保留近 30 天資料。

**Gate 2 驗證結果 (SQL SELECT)：**
- 成功插入/更新 `330` 筆預報紀錄（依據 API 請求時間，取得 15 個時段），涵蓋所有 `22` 縣市。

**Gate 2 PASS Checklist：**
```text
[PASS] Read JSON output from Gate 1
[PASS] SQLite schema configured
[PASS] Duplicate strategy (UNIQUE/REPLACE) implemented
[PASS] ETL process successful
[PASS] Verified via SQL SELECT
[PASS] No GIS work started
```

---

## Gate 3 — Taiwan GIS Web ✅ PASS

**技術棧：** Python Flask (API + 背景排程) + Vanilla JS / Leaflet (前端) + Custom Glassmorphism CSS  
**前端檔案：** `static/index.html`, `static/style.css`, `static/script.js`  
**後端檔案：** `server.py`, `collector.py`

### 地圖與 UI
1. **Taiwan Map：** Leaflet + OpenStreetMap / Carto Dark 雙底圖，置中對齊全台。
2. **Glassmorphism UI：** 深色半透明玻璃質感 Sidebar、Dashboard、Popup，採用 Custom CSS 實作。
3. **縣市 Pill Marker：** 透過 `COORDINATES` 對映 22 縣市座標，以自訂 Pill Marker 標示溫度 / 降雨機率，支援 `MarkerClusterGroup` 叢集。
4. **Weather Popup：** 點擊 Marker 顯示地點、天氣現象 Emoji、最高/低/平均氣溫、降雨機率，並即時呼叫 `F-C0032-001` API 顯示未來 6 時段的 36h 預報 Timeline。

### 圖層系統（LayerManager）
5. **圖層切換（6 圖層）：**
   - **溫度標籤**（`layerTemp`）：依溫度顯示漸層色 Pill Marker，支援 Cluster。
   - **降雨機率**（`layerPop`）：降雨機率 % 標籤，支援 Cluster。
   - **風速圖層**（`layerWind`）：即時自動氣象站觀測，顯示風速 / 風向 Emoji，LOD（zoom ≤ 9 圓點 / zoom ≥ 10 標籤），碰撞迴避、最多 80 個標籤。
   - **濕度圖層**（`layerHumd`）：即時觀測相對濕度，顏色漸層 + 碰撞迴避。
   - **溫度熱力圖**（`layerHeat`）：以 IDW 插值（Web Worker）結合 Turf.js 計算台灣範圍內的溫度等值面（Isoband），並裁切至台灣邊界（`taiwan.json`）。
   - **偵錯觀測**（`layerDebugObs`）：顯示所有測站原始座標點（開發除錯用）。
6. **底圖切換：** 深色（CartoDB Dark）/ 街道圖（OpenStreetMap）。
7. **城市快速搜尋：** 自訂 Dropdown，選取縣市後 `flyTo` 縮放並自動開啟預報 Popup。

### 資料層與系統
8. **自動觀測收集器（`collector.py`）：** 背景 APScheduler，每 10 分鐘抓取 `O-A0001-001` 全台自動氣象站觀測，合理性過濾（-99/-999 無效值、範圍檢查），`INSERT OR IGNORE` 去重，每 24 小時清理 30 天前舊資料。
9. **Database Integration：** 資料 100% 由 Flask 後端從 `data.db` 取出，無任何 hard-code 氣象資料。
10. **歷史觀測 API：** `GET /api/stations/<id>/history?hours=<N>` 支援查詢測站最長 30 天歷史紀錄。
11. **Collector Status API：** `GET /api/system/collector-status` 回傳最後一次成功抓取時間、本次寫入筆數、資料庫統計（總筆數、最舊/最新時間、測站數）。
12. **CWA Proxy：** `GET /api/cwa/<dataset>` 代理任意 CWA Open Data，API Key 不外露。
13. **警報輪詢系統：** 啟動後自動輪詢 `W-C0033-001`（特報）與 `E-A0015-001`（顯著有感地震），以 Banner + Modal 顯示，自動輪替多筆警報。
14. **平行載入架構：** `Promise.allSettled` 同時載入預報、台灣邊界 GeoJSON（8 MB）、觀測資料，各圖層互不阻塞，主地圖最快速度可用。
15. **即時時鐘：** 右上角每秒更新台灣時間。
16. **Error Toast + 重試機制：** 任何 API 失敗均顯示錯誤提示並提供一鍵重試。

**Gate 3 PASS Checklist：**
```text
[PASS] Local Map displaying Taiwan
[PASS] Locations matched and parsed to map (22 counties, Pill Markers)
[PASS] Popups showing correct Weather & Temperature
[PASS] Data successfully read from SQLite Gate 2 DB
[PASS] 6-layer interactive map fully built (temp/PoP/wind/humidity/heatmap/debug)
[PASS] Glassmorphism 深色主題
[PASS] Real-time observation collector (collector.py, 10-min auto-fetch)
[PASS] IDW Isoband heatmap (Turf.js + Web Worker)
[PASS] Weather alert polling (W-C0033-001 / E-A0015-001)
[PASS] Parallel data loading (no UI blocking)
```

---

## Gate 4 — GitHub ✅ PASS

**Repository：** 原始碼與配置全數推送至 GitHub `main`  
**安全規則：** `.env` 列入 `.gitignore`，API Key 不進版控。

**Gate 4 PASS Checklist：**
```text
[PASS] 原始碼推送至 GitHub main branch
[PASS] .gitignore 排除 .env, .venv/, __pycache__/
[PASS] 無任何 secret 寫入原始碼
[PASS] README 五大 Gate Tracker 自動化更新並 commit
```

---

## Gate 5 — Vercel ✅ PASS

為了使 Python Flask app 能夠在 Vercel 順利運行，已經建立了正確的 Serverless 配置：

1. **`vercel.json`**：設定 `@vercel/python` building routing。
2. **`api/index.py`**：Vercel Serverless Function 專屬進入點，負責 binding Flask。
3. **Absolute Pathing**：修改了 Flask 從 `server.py` 抓取 `data.db` 與 `static/` 資料夾的邏輯為 `os.path.abspath(__file__)` 絕對路徑，避開 Vercel ephemeral filesystem 路徑錯亂。

**Gate 5 PASS Checklist：**
```text
[PASS] vercel.json 設定 Python Serverless
[PASS] GitHub Repository 連結至 Vercel
[PASS] Push to main 觸發自動部署
[PASS] 公開網址可正常訪問
[PASS] Flask API 正常運作
```

---

## 💻 本地開發 (Local Development)

```bash
# 安裝依賴
pip install -r requirements.txt

# 啟動 Flask 伺服器（含背景自動收集器）
python server.py

# 然後開啟瀏覽器訪問
http://127.0.0.1:5000
```

> **注意：** 伺服器啟動後，`collector.py` 會立即在背景執行一次觀測資料抓取，之後每 10 分鐘自動更新。

### CWA API Key 設定

真正的 CWA Key 只能存在 Local `.env` 與部署平台的 Environment Variables。

請在根目錄建立 `.env` 檔案：
```env
CWA_API_KEY=YOUR_CWA_API_KEY
CARTO_API_KEY=YOUR_CARTO_API_KEY   # 選填，無此 Key 仍可使用 OSM 底圖
```
> **注意：** `.env` 檔案已加入 `.gitignore`，請勿 commit 此檔案。若 Secret 曾被 commit，必須視為 exposed 並 rotate。

---

## 📁 專案結構

```
NCHU_AIoT_0923_CWA/
├── api/
│   └── index.py        # Vercel Serverless Function 進入點
├── static/
│   ├── index.html      # 主頁面（Leaflet Map + UI）
│   ├── style.css       # 樣式表（Glassmorphism）
│   ├── script.js       # 前端邏輯（地圖渲染、圖層管理、IDW、警報）
│   └── taiwan.json     # 台灣行政區邊界 GeoJSON（IDW 熱力圖裁切用）
├── server.py           # Flask 開發伺服器、所有 API 端點、啟動排程
├── collector.py        # CWA 自動氣象站觀測收集器（APScheduler 背景排程）
├── gate1.py            # Gate 1 驗證腳本（CWA API 測試）
├── gate2.py            # Gate 2 驗證腳本（ETL + SQLite 入庫）
├── data.db             # SQLite 資料庫（預報 + 即時觀測，WAL 模式）
├── gate1_output.json   # Gate 1 輸出（22 縣市，無金鑰）
├── requirements.txt    # Python 依賴清單
├── vercel.json         # Vercel Serverless 部署設定
├── .env                # CWA / Carto API 授權金鑰 (不進版控)
├── design.md           # 系統架構設計文件
└── README.md           # 本說明文件
```

---

*AI for Learning | AI for a Better Taiwan*