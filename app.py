import streamlit as st
import pandas as pd
import sqlite3
import folium
from streamlit_folium import st_folium
import os

# --- 網頁基本設定 ---
st.set_page_config(
    page_title="Taiwan Weather Forecast",
    page_icon="🌤️",
    layout="wide"
)

st.title("🌤️ Taiwan Weather Forecast (台灣天氣預報)")
st.markdown("從氣象資料到互動式天氣預報應用 | *Code Smarter, Build a Better Tomorrow!*")

# --- 資料庫讀取 ---
DB_PATH = "data.db"

@st.cache_data(ttl=3600)  # 快取 1 小時
def load_data():
    if not os.path.exists(DB_PATH):
        return pd.DataFrame()
    
    try:
        conn = sqlite3.connect(DB_PATH)
        # 讀取資料
        query = "SELECT * FROM TemperatureForecasts"
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df
    except Exception as e:
        st.error(f"讀取資料庫錯誤: {e}")
        return pd.DataFrame()

df = load_data()

if df.empty:
    st.warning("⚠️ 找不到氣象資料！請先在 `.env` 設定 `CWA_API_KEY`，然後執行 `python data_pipeline.py` 來獲取最新資料。")
    st.stop()

# --- 側邊欄：互動式操作 ---
st.sidebar.header("篩選條件")

# 1. 選擇地區 (下拉選單)
regions = df['regionName'].unique()
selected_region = st.sidebar.selectbox("選擇地區 (Select Region):", regions)

# 2. 選擇日期 (下拉選單 - 用於地圖)
dates = sorted(df['dataDate'].unique())
selected_date = st.sidebar.selectbox("選擇日期 (Select Date) [地圖用]:", dates)

# 根據選擇過濾資料
region_df = df[df['regionName'] == selected_region].sort_values(by='dataDate')
date_df = df[df['dataDate'] == selected_date]

# --- 頁籤切換 ---
tab1, tab2 = st.tabs(["📊 區域天氣趨勢 (Chart & Table)", "🗺️ 全台氣溫地圖 (Map)"])

with tab1:
    st.subheader(f"📍 {selected_region} - 一週氣溫趨勢")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 繪製折線圖
        st.markdown("**最高與最低氣溫折線圖**")
        st.line_chart(
            region_df.set_index('dataDate')[['maxt', 'mint']],
            color=["#FF5733", "#33C1FF"] # maxt 紅色系, mint 藍色系
        )
        
    with col2:
        # 顯示資料表格
        st.markdown("**詳細資料表格**")
        display_df = region_df[['dataDate', 'mint', 'maxt']].rename(
            columns={'dataDate': 'Date', 'mint': 'MinT', 'maxt': 'MaxT'}
        )
        st.dataframe(display_df, hide_index=True, use_container_width=True)

with tab2:
    st.subheader(f"🗺️ {selected_date} 全台平均氣溫分佈")
    
    # 建立 Folium 地圖，中心點設在台灣
    m = folium.Map(location=[23.7, 121.0], zoom_start=7)
    
    # 簡單的經緯度對應表 (為了地圖打點示範，精確座標可依需求擴充)
    # 注意：這裡僅做幾點示範，真實應用需要完整台灣 22 縣市的經緯度 mapping
    city_coords = {
        '臺北市': [25.032969, 121.565418],
        '新北市': [25.011985, 121.465134],
        '桃園市': [24.993628, 121.300980],
        '臺中市': [24.147736, 120.673648],
        '臺南市': [22.999728, 120.227028],
        '高雄市': [22.627278, 120.301435],
        '花蓮縣': [23.987159, 121.601571],
        '臺東縣': [22.758333, 121.144444],
        # 可依實際抓到的 regionName 補齊
    }
    
    # 在地圖上加上 Marker
    for index, row in date_df.iterrows():
        city = row['regionName']
        if city in city_coords:
            avg_temp = (row['maxt'] + row['mint']) / 2
            
            # 依據平均溫度給予不同顏色
            if avg_temp < 20:
                color = 'blue'
            elif 20 <= avg_temp < 25:
                color = 'green'
            elif 25 <= avg_temp < 30:
                color = 'orange'
            else:
                color = 'red'
                
            popup_html = f"<b>{city}</b><br>Max: {row['maxt']}°C<br>Min: {row['mint']}°C"
            
            folium.CircleMarker(
                location=city_coords[city],
                radius=10,
                popup=folium.Popup(popup_html, max_width=200),
                color=color,
                fill=True,
                fill_color=color,
                fill_opacity=0.7
            ).add_to(m)
            
    # 顯示地圖
    st_folium(m, width=700, height=500)

st.markdown("---")
st.markdown("💡 *提示：可切換不同地區或日期，觀察折線圖與地圖的互動變化。*")
