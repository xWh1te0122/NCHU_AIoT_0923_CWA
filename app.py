import streamlit as st
import pandas as pd
import sqlite3
import folium
from streamlit_folium import st_folium
import os

# --- 網頁基本設定 ---
st.set_page_config(
    page_title="Taiwan Real-Time Weather",
    page_icon="🌤️",
    layout="wide"
)

st.title("🌤️ Taiwan Real-Time Weather (台灣即時氣象觀測)")
st.markdown("從即時氣象資料到互動式天氣觀測應用 | *Code Smarter, Build a Better Tomorrow!*")

# --- 資料庫讀取 ---
DB_PATH = "data.db"

@st.cache_data(ttl=600)  # 快取 10 分鐘，因為即時觀測更新較頻繁
def load_data():
    if not os.path.exists(DB_PATH):
        return pd.DataFrame()
    
    try:
        conn = sqlite3.connect(DB_PATH)
        # 讀取即時觀測資料
        query = "SELECT * FROM CurrentWeather"
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        # 依觀測時間降序排序，確保我們拿到最新的資料
        df = df.sort_values(by=['ObsTime'], ascending=False)
        # 如果同測站有多筆，只保留最新的一筆
        df = df.drop_duplicates(subset=['StationName'], keep='first')
        return df
    except Exception as e:
        st.error(f"讀取資料庫錯誤: {e}")
        return pd.DataFrame()

df = load_data()

if df.empty:
    st.warning("⚠️ 找不到氣象資料！請先在 `.env` 設定 `CWA_API_KEY`，然後執行 `python data_pipeline.py` 來獲取最新資料。")
    st.stop()

# 取得最後更新時間
latest_time = df['ObsTime'].max()
st.info(f"🕒 資料最後更新時間: {latest_time}")

# --- 側邊欄：互動式操作 ---
st.sidebar.header("篩選條件")

# 1. 選擇縣市 (下拉選單)
# 過濾掉空值或無效的縣市名稱
valid_counties = [c for c in df['CountyName'].unique() if pd.notna(c) and c != ""]
selected_county = st.sidebar.selectbox("選擇縣市 (Select County):", sorted(valid_counties))

# 根據選擇過濾資料
county_df = df[df['CountyName'] == selected_county].sort_values(by='AirTemperature', ascending=False)

# --- 頁籤切換 ---
tab1, tab2 = st.tabs(["📊 縣市各測站氣溫 (Chart & Table)", "🗺️ 全台氣溫地圖 (Map)"])

with tab1:
    st.subheader(f"📍 {selected_county} - 各觀測站即時氣溫")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 繪製長條圖
        st.markdown("**各測站氣溫長條圖**")
        if not county_df.empty:
            st.bar_chart(
                data=county_df.set_index('StationName')['AirTemperature'],
                color="#FF5733"
            )
        else:
            st.write("目前該縣市無有效測站資料。")
        
    with col2:
        # 顯示資料表格
        st.markdown("**詳細資料表格**")
        display_df = county_df[['StationName', 'AirTemperature', 'Weather']].rename(
            columns={'StationName': '測站', 'AirTemperature': '氣溫(°C)', 'Weather': '天氣'}
        )
        st.dataframe(display_df, hide_index=True, use_container_width=True)

with tab2:
    st.subheader("🗺️ 全台觀測站即時氣溫分佈")
    
    # 建立 Folium 地圖，中心點設在台灣
    m = folium.Map(location=[23.7, 121.0], zoom_start=7)
    
    # 在地圖上加上 Marker (使用真實經緯度)
    for index, row in df.iterrows():
        lat = row['Latitude']
        lon = row['Longitude']
        
        # 確保經緯度是有效的數字
        if pd.notna(lat) and pd.notna(lon):
            temp = row['AirTemperature']
            city = row['CountyName']
            station = row['StationName']
            weather = row['Weather']
            
            # 依據溫度給予不同顏色
            if temp < 20:
                color = 'blue'
            elif 20 <= temp < 25:
                color = 'green'
            elif 25 <= temp < 30:
                color = 'orange'
            else:
                color = 'red'
                
            popup_html = f"<b>{station} ({city})</b><br>氣溫: {temp}°C<br>天氣: {weather}"
            
            folium.CircleMarker(
                location=[lat, lon],
                radius=8,
                popup=folium.Popup(popup_html, max_width=200),
                color=color,
                fill=True,
                fill_color=color,
                fill_opacity=0.7,
                tooltip=f"{station}: {temp}°C"
            ).add_to(m)
            
    # 顯示地圖
    st_folium(m, width=700, height=500)

st.markdown("---")
st.markdown("💡 *提示：可切換不同縣市，觀察長條圖的變化，或是滑動地圖查看全台各地的即時觀測數據。*")
