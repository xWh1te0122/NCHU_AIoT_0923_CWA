# 🌤️ AI 創新微課程：Taiwan Weather Forecast

> **從氣象資料到互動式天氣預報應用**  
> *Code Smarter, Build a Better Tomorrow!*

這是一個結合 **AI × 資料 × 天氣 × 實作** 的微課程專案，旨在引導學習者從無到有打造一個「互動式台灣天氣預報 Dashboard」。我們將使用 Python 串接真實氣象數據，並透過 AI 輔助與現代化工具，讓「用程式探索天氣、用資料看見台灣」變得簡單且有趣。

*「技術可以解決問題，但更重要的是用技術創造更好的未來！」—— 煥哥*

---

## 🛠️ 技術棧 (Tech Stack)

本專案從資料獲取、儲存到前端展示，完整涵蓋以下技術：

* **開放資料 (Open Data):** 中央氣象署 (CWA) API
* **資料格式:** JSON
* **程式語言:** Python 
  * 請求與爬取: `requests`
  * 資料處理: `pandas`
* **資料庫:** SQLite (`sqlite3`)
* **Web 框架:** Streamlit
* **資料視覺化:** Folium (互動地圖), Streamlit 內建圖表 (折線圖/表格)

---

## 🎯 課程與專案目標 (Objectives)

1. **API 與資料解析：** 掌握 HTTP 請求與複雜 JSON 結構的解析技巧。
2. **資料庫操作：** 學習建立輕量級 SQLite 資料庫並撰寫基本的 SQL 查詢。
3. **快速 Web 開發：** 使用 Streamlit 快速建構具備下拉選單、日期選擇等互動介面的 Web App。
4. **地理資訊視覺化：** 結合 Folium 將氣溫資料動態繪製於台灣地圖上。
5. **程式碼品質與版控：** 學習錯誤處理、防呆機制優化，並將成果上傳至 GitHub。

---

## 🗺️ 開發藍圖與實作步驟 (Roadmap)

本專案分為 24 個核心步驟，從基礎到進階循序漸進：

### 階段一：資料獲取與解析 (Data Acquisition)
- [ ] **Step 1 - 2:** 課程介紹、專案目標確認，了解氣象資料對生活與決策的重要性。
- [ ] **Step 3 - 4:** 註冊 CWA 平台取得 API Key，並使用 Python `requests` 成功獲取 JSON 資料。
- [ ] **Step 5 - 6:** 剖析 JSON 結構，精準定位並提取各縣市的「最高溫 (MaxT)」與「最低溫 (MinT)」。
- [ ] **Step 7:** 使用 `pandas` 將提取的資料轉換為 DataFrame 進行整理與預覽。

### 階段二：資料儲存與管理 (Database)
- [ ] **Step 8:** 建立本地 SQLite 資料庫 (`data.db`)。
- [ ] **Step 9:** 設計 `TemperatureForecasts` 資料表 (包含 ID, 地區, 日期, 最低溫, 最高溫)。
- [ ] **Step 10:** 撰寫 SQL `SELECT` 語法查詢並驗證資料庫內容是否正確寫入。

### 階段三：互動式 Web App 實作 (Streamlit App)
- [ ] **Step 11:** Streamlit 環境安裝與第一支 "Hello World" 程式。
- [ ] **Step 12:** 將 SQLite 資料庫透過 Pandas `read_sql_query` 橋接至 Streamlit 網頁。
- [ ] **Step 13:** 建立「地區選擇 (Select Region)」下拉選單，實現互動操作。
- [ ] **Step 14:** 繪製一週最高與最低氣溫的**折線圖**。
- [ ] **Step 15:** 實作資料**表格**，清楚呈現每日詳細數值。
- [ ] **Step 16:** 整合選單、圖表與表格，完成單一地區的天氣預報介面。

### 階段四：進階視覺化與發布 (Advanced & Deployment)
- [ ] **Step 17:** 導入 `Folium`，透過平均溫度計算將各縣市以不同顏色標示於台灣地圖上。
- [ ] **Step 18:** 增加「日期選擇 (Select Date)」功能，打造可切換時間的動態天氣地圖。
- [ ] **Step 19:** 介面總整，完成最終版 **Taiwan Weather Dashboard** 成果展示。
- [ ] **Step 20:** 程式碼品質優化 (清晰的結構、錯誤處理機制、防止資料重複插入、完善註解)。
- [ ] **Step 21:** 建立 GitHub Repository，將專案 Commit & Push 進行版本管理與備份。

---

## 🚀 未來延伸應用 (Future Explorations)

完成基礎 Dashboard 後，可嘗試以下延伸發想 (Step 22-24)：
- **聊天機器人:** 結合 Line Bot 開發每日天氣提醒小幫手。
- **生活建議:** 根據天氣資料提供旅遊行程建議或穿搭指南。
- **產業應用:** 結合農業數據或防災系統進行交叉分析。
- **AI 結合:** 導入機器學習模型進行天氣趨勢預測，或是利用 AI 輔助開發更複雜的功能。

---
*AI for Learning | AI for a Better Taiwan*