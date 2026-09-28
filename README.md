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
CWA Government Open Data (F-D0047-091)
        ↓
     REST API
        ↓
       JSON
        ↓
 Parse / Clean / Transform (ETL)
        ↓
      SQLite (data.db)
        ↓
   Backend API (Flask)
        ↓
Taiwan GIS Web
Leaflet + OpenStreetMap + GeoJSON
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

**資料庫檔案：** `data.db` (SQLite)  
**資料表：** `weather_forecasts`

已將 Gate 1 的真實 CWA JSON 做 ETL 處理。
設計 Duplicate Strategy 採用 `UNIQUE(location_name, forecast_start)` 與 `INSERT OR REPLACE` 策略。

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

**技術棧：** Python Flask (API) + Vanilla JS / Leaflet (前端) + Custom Tailwind-style CSS  
**前端檔案：** `static/index.html`, `static/style.css`, `static/script.js`
**後端檔案：** `server.py`

**主要功能：**
1. **Taiwan Map:** 載入 Folium/Leaflet 的 OpenStreetMap 與 Carto Dark 底圖，置中對齊全台。
2. **Glassmorphism UI:** 實作精確的深色半透明玻璃質感 Sidebar 與 Dashboard。
3. **Multiple Locations & Marker:** 透過 `COORDINATES` 取代 CWA 未提供的經緯度，以自訂的 Pill Marker 精確標示全台 22 縣市。
4. **Weather Popup:** 點擊 Marker 顯示地點、天氣狀況、最高與最低氣溫與降雨機率。
5. **Database Integration:** 資料 100% 由 Flask 後端 `api/weather` 從 `data.db` 取出，沒有任何 hard-code 的氣候預報資料。
6. **Interactive Dashboard:** 
   - 漸層圖例對應溫度與降雨顏色。
   - 支援圖層切換：溫度標籤 vs 降雨機率標籤。
   - 支援底圖切換：深色模式 vs 街道圖。

**Gate 3 PASS Checklist：**
```text
[PASS] Local Map displaying Taiwan
[PASS] Locations matched and parsed to map
[PASS] Popups showing correct Weather & Temperature
[PASS] Data successfully read from SQLite Gate 2 DB
[PASS] Streamlit Interactive map fully built
[PASS] Glassmorphism 深色主題
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
# 啟動 Flask 伺服器
python server.py

# 然後開啟瀏覽器訪問
http://127.0.0.1:5000
```

### CWA API Key 設定

真正的 CWA Key 只能存在 Local `.env` 與部署平台的 Environment Variables。

請在根目錄建立 `.env` 檔案：
```env
CWA_API_KEY=YOUR_CWA_API_KEY
```
> **注意：** `.env` 檔案已加入 `.gitignore`，請勿 commit 此檔案。若 Secret 曾被 commit，必須視為 exposed 並 rotate。

---

## 📁 專案結構

```
NCHU_AIoT_0923_CWA/
├── api/
│   └── index.py    # Vercel Serverless Function 進入點
├── static/
│   ├── index.html  # 主頁面（Leaflet Map + UI）
│   ├── style.css   # 樣式表（Glassmorphism）
│   └── script.js   # 前端邏輯（地圖渲染、呼叫 Flask API）
├── server.py       # 本地 Flask 開發伺服器與 API 端點
├── data.db         # SQLite 資料庫（存放 CWA 預報資料）
├── vercel.json     # Vercel Serverless 部署設定
├── .env            # CWA API 授權金鑰 (不進版控)
├── design.md       # 系統架構設計文件
└── README.md       # 本說明文件
```

---

*AI for Learning | AI for a Better Taiwan*