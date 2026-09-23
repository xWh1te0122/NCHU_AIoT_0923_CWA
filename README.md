# 🌤️ NCHU AIoT × CWA 智慧氣象監控儀表板

> **從氣象資料到互動式天氣預報應用**  
> *Code Smarter, Build a Better Tomorrow!*

這是一個結合 **AI × 資料 × 天氣 × 實作** 的微課程專案，旨在引導學習者從無到有打造一個「互動式台灣天氣預報 Dashboard」。我們使用 Python 串接真實氣象數據（CWA API），前端以純 HTML / CSS / JavaScript 呈現，並部署至 **Vercel** 進行公開展示。

*「技術可以解決問題，但更重要的是用技術創造更好的未來！」—— 煥哥*

---

## 🛠️ 技術棧 (Tech Stack)

| 層次 | 技術 |
|------|------|
| **開放資料** | 中央氣象署 (CWA) Open Data API |
| **資料格式** | JSON |
| **後端 / Pipeline** | Python (`requests`, `pandas`, `sqlite3`, `python-dotenv`) |
| **前端** | HTML5 + Vanilla CSS + JavaScript (Canvas API) |
| **部署平台** | **Vercel**（靜態網站，免費方案） |

---

## 🎯 課程與專案目標 (Objectives)

1. **API 與資料解析：** 掌握 HTTP 請求與複雜 JSON 結構的解析技巧。
2. **資料庫操作：** 學習建立輕量級 SQLite 資料庫並撰寫基本的 SQL 查詢。
3. **前端實作：** 用原生 HTML / CSS / JS 打造美觀的天氣儀表板，不依賴任何框架。
4. **地理資訊視覺化：** 透過 Canvas API 繪製 24 小時氣溫趨勢圖。
5. **程式碼品質與版控：** 學習錯誤處理、防呆機制優化，並將成果上傳至 GitHub。
6. **雲端部署：** 使用 Vercel 一鍵部署靜態網站，獲得公開網址。

---

## 🚀 部署說明 (Vercel Deployment)

本專案前端為純靜態網站，可直接部署至 Vercel，**無需任何後端伺服器**。

### 方法一：透過 Vercel 網站 (推薦，最簡單)

1. 前往 [vercel.com](https://vercel.com) 並使用 GitHub 帳號登入。
2. 點擊 **「Add New Project」** → **「Import Git Repository」**。
3. 選擇此專案的 GitHub Repository。
4. Vercel 會自動偵測為靜態網站（因為有 `vercel.json`），直接點擊 **「Deploy」**。
5. 幾秒後即可獲得公開網址（例如：`https://nchu-aiot-cwa.vercel.app`）。

### 方法二：透過 Vercel CLI

```bash
# 安裝 Vercel CLI (只需做一次)
npm install -g vercel

# 在專案資料夾內執行部署
vercel

# 若要部署到正式環境
vercel --prod
```

### 環境變數設定（選用）

若要在 Vercel 上啟用真實 CWA API 功能，可在 Vercel 專案設定中加入環境變數：

- 前往 Vercel Dashboard → 你的專案 → **Settings** → **Environment Variables**
- 新增 `CWA_API_KEY`，填入你在 [氣象署開放資料平台](https://opendata.cwa.gov.tw/) 申請的授權碼

> **注意：** 前端 `app.js` 已支援使用者在瀏覽器端透過「API 設定」按鈕輸入 CWA Key，金鑰儲存於 `localStorage`，不需要後端即可直接向 CWA API 取得即時資料。

---

## 💻 本地開發 (Local Development)

```bash
# 直接用瀏覽器開啟（最簡單）
open index.html   # macOS
start index.html  # Windows

# 或使用 VS Code Live Server 擴充套件（推薦）
# 安裝後右鍵 index.html → Open with Live Server
```

### 執行資料 Pipeline（更新 SQLite 資料）

若想在本地更新天氣資料庫：

```bash
# 安裝 Python 依賴
pip install -r requirements.txt

# 設定環境變數
cp .env.example .env   # 並填入 CWA_API_KEY

# 執行資料抓取
python data_pipeline.py
```

---

## 📁 專案結構

```
NCHU_AIoT_0923_CWA/
├── index.html          # 主頁面（純 HTML 結構）
├── style.css           # 樣式表（Glassmorphism 深色主題）
├── app.js              # 前端邏輯（資料渲染、Canvas 圖表、互動）
├── vercel.json         # Vercel 部署設定
├── data_pipeline.py    # Python 資料抓取 Pipeline（本地用）
├── app.py              # 舊版 Streamlit 應用（已棄用）
├── requirements.txt    # Python 依賴（僅 Pipeline 使用）
├── .env                # 本地環境變數（不進版控）
└── README.md           # 本說明文件
```

---

## 🗺️ 開發藍圖 (Roadmap)

### 階段一：資料獲取與解析 (Data Acquisition)
- [ ] **Step 1 - 2:** 課程介紹、專案目標確認，了解氣象資料對生活與決策的重要性。
- [ ] **Step 3 - 4:** 註冊 CWA 平台取得 API Key，並使用 Python `requests` 成功獲取 JSON 資料。
- [ ] **Step 5 - 6:** 剖析 JSON 結構，精準定位並提取各縣市氣象數據。
- [ ] **Step 7:** 使用 `pandas` 將提取的資料轉換為 DataFrame 進行整理與預覽。

### 階段二：資料儲存與管理 (Database)
- [ ] **Step 8:** 建立本地 SQLite 資料庫 (`data.db`)。
- [ ] **Step 9:** 設計資料表並寫入氣象觀測資料。
- [ ] **Step 10:** 撰寫 SQL `SELECT` 語法查詢並驗證資料庫內容是否正確寫入。

### 階段三：前端 Dashboard 實作 (Frontend)
- [ ] **Step 11:** HTML 骨架與 CSS 深色主題設計。
- [ ] **Step 12:** 城市側邊欄與氣象 KPI 卡片。
- [ ] **Step 13:** Canvas API 繪製 24 小時氣溫趨勢圖。
- [ ] **Step 14:** AIoT 感測節點模擬（土壤濕度、光照度、氣壓、RSSI）。
- [ ] **Step 15:** CWA API 整合（前端直接請求）。
- [ ] **Step 16:** 響應式設計，支援手機版面。

### 階段四：部署與發布 (Deployment)
- [ ] **Step 17:** 建立 GitHub Repository，Commit & Push。
- [ ] **Step 18:** 連結 Vercel，一鍵部署取得公開網址。
- [ ] **Step 19:** 設定自訂網域（選用）。
- [ ] **Step 20:** 成果展示與分享。

---

## 🔮 未來延伸應用 (Future Explorations)

- **聊天機器人:** 結合 Line Bot 開發每日天氣提醒小幫手。
- **生活建議:** 根據天氣資料提供旅遊行程建議或穿搭指南。
- **產業應用:** 結合農業數據或防災系統進行交叉分析。
- **AI 結合:** 導入機器學習模型進行天氣趨勢預測。

---

*AI for Learning | AI for a Better Taiwan*