# Design — NCHU AIoT × CWA 智慧氣象監控儀表板

## 1. Purpose

本專案採五 Gate 架構：

```text
CWA API → ETL 處理 (Python) → SQLite 資料庫 → Flask 後端 → Dashboard UI (Taiwan GIS) → GitHub → Vercel
```

核心要求：使用可追溯的 CWA 真實 Open Data，逐 Gate 建置與驗證。  
本專案為**全端架構 (Full-Stack)**，包含資料獲取、資料庫儲存、後端 API 服務與前端 GIS 儀表板。

---

## 2. System Architecture

```text
CWA Open Data (F-D0047-091)
   ↓ Python ETL 腳本 (gate1.py, gate2.py)
JSON 處理與正規化
   ↓
SQLite Database (data.db) — 存放預報資料
   ↓ 
Python Flask (server.py) — 後端 API
   ↓ JSON (/api/weather, /api/config)
JavaScript (script.js) — 前端渲染
   ↓ 
Glassmorphism Dashboard UI + Leaflet Map
   ↓ Leaflet API
24hr 氣溫趨勢 + 降雨機率 + 22 縣市地理定位
   ↓
GitHub
   ↓
Vercel Auto Deployment (Serverless Function)
```

---

## 3. Gate 1 — Data Acquisition (CWA API)

**Dataset：** `F-D0047-091`（全臺縣市 7 天天氣預報，每 12 小時更新）  
**認證方式：** 後端 `.env` 提供 `CWA_API_KEY`，不寫入原始碼。

**實際 JSON Schema：**
```text
records.Locations[0].Location[]
  └── LocationName        (縣市名稱)
  └── WeatherElement[]
        ├── T             (平均溫度)
        ├── MaxT          (最高溫度)
        ├── MinT          (最低溫度)
        ├── Wx            (天氣現象, 每 12hr)
        └── PoP12h        (12 小時降雨機率)
```

---

## 4. Gate 2 — Data Engineering (資料庫與 ETL)

本階段利用 Python 將原始資料載入 SQLite 資料庫：

**ETL 流程：**
```text
Extract CWA JSON (gate1.py)
  → Transform / Normalize (gate2.py)
      → 擷取 15 個時段的 T, MaxT, MinT, Wx, PoP12h
  → Load into SQLite (data.db)
```

**資料庫設計 (`weather_forecasts` 表)：**
- `location_name`: 縣市名稱
- `forecast_start` / `forecast_end`: 預報時段
- `avg_t` / `max_t` / `min_t`: 氣溫資訊
- `wx`: 天氣現象
- `pop_12h`: 降雨機率
- **Duplicate Strategy：** `UNIQUE(location_name, forecast_start)` 配合 `INSERT OR REPLACE` 確保資料不重複。

---

## 5. Gate 3 — Dashboard UI (GIS Application)

**後端技術：** Python Flask (`server.py`)  
**前端技術：** HTML5 + Vanilla CSS (Glassmorphism) + JavaScript (Leaflet API)

**主要功能模組：**
```text
server.py           → 提供 /api/weather, /api/config 等端點，並連接 data.db
static/
  ├── index.html    → 頁面骨架、Leaflet 地圖容器、KPI 卡片
  ├── style.css     → Glassmorphism 深色主題、響應式排版
  └── script.js     → 呼叫 Flask API、建立 Leaflet 地圖、標記 (Marker) 與自訂 Popup
```

**互動設計：**
- 圖層控制：切換溫度標籤 / 降雨機率
- 底圖切換：Carto Dark 深色底圖 vs OSM Street 街道圖
- 地圖互動：點擊 Marker 顯示詳細氣象資訊

---

## 6. Gate 4 — GitHub

**Repository 規則：**
- `main` branch 作為唯一部署分支
- `.env`, `.venv/`, `__pycache__/` 列入 `.gitignore`
- 機敏資料 (API Key) 絕不進入版本控制

---

## 7. Gate 5 — Vercel 部署

**部署方式：** Vercel Serverless Functions  
**設定檔：** `vercel.json`

```json
{
  "builds": [
    { "src": "api/index.py", "use": "@vercel/python" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "api/index.py" }
  ]
}
```
**關鍵修改：** 使用 `api/index.py` 作為 Flask 應用的進入點，並在 `server.py` 中使用絕對路徑 (`os.path.abspath(__file__)`) 確保在 Vercel 環境下能正確找到 `data.db` 與 `static/` 資料夾。
