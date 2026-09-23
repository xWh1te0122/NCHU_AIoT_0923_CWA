import os
import requests
import pandas as pd
import sqlite3
import urllib3
from dotenv import load_dotenv

# 忽略因為 verify=False 產生的警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 載入 .env 檔案中的環境變數
load_dotenv()

CWA_API_KEY = os.getenv("CWA_API_KEY")
# O-A0003-001 為氣象觀測站-10分鐘綜觀氣象資料
CWA_API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0003-001"

def fetch_weather_data(api_key=CWA_API_KEY):
    """
    從中央氣象署取得即時觀測氣象資料 (JSON)
    """
    if not api_key:
        raise ValueError("尚未設定 CWA_API_KEY，請在 .env 檔案中設定。")
    
    headers = {'Authorization': api_key}
    # 加上 verify=False 繞過 SSL 憑證驗證問題
    response = requests.get(CWA_API_URL, headers=headers, verify=False)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API 請求失敗: 狀態碼 {response.status_code}")

def parse_weather_data(json_data):
    """
    解析 JSON，提取各觀測站的即時氣溫與經緯度資訊
    """
    records = []
    
    stations = json_data.get('records', {}).get('Station', [])
    if not stations:
        return pd.DataFrame()
        
    for st in stations:
        station_name = st.get('StationName')
        station_id = st.get('StationId')
        
        obs_time = st.get('ObsTime', {}).get('DateTime')
        
        geo_info = st.get('GeoInfo', {})
        county_name = geo_info.get('CountyName')
        
        # 尋找 WGS84 座標 (通常用於 Leaflet/Folium)
        lat, lon = None, None
        coords = geo_info.get('Coordinates', [])
        for c in coords:
            if c.get('CoordinateName') == 'WGS84':
                lat = c.get('StationLatitude')
                lon = c.get('StationLongitude')
                break
        
        weather_elem = st.get('WeatherElement', {})
        air_temp = weather_elem.get('AirTemperature')
        weather = weather_elem.get('Weather')
        
        # 過濾掉異常值 (如 -99 或無效資料)
        try:
            air_temp_val = float(air_temp)
            if air_temp_val == -99.0 or lat is None or lon is None:
                continue
            lat_val = float(lat)
            lon_val = float(lon)
        except (ValueError, TypeError):
            continue
            
        records.append({
            'StationName': station_name,
            'StationId': station_id,
            'CountyName': county_name,
            'ObsTime': obs_time,
            'AirTemperature': air_temp_val,
            'Weather': weather,
            'Latitude': lat_val,
            'Longitude': lon_val
        })
                
    df = pd.DataFrame(records)
    return df

def save_to_sqlite(df, db_path="data.db"):
    """
    將 DataFrame 儲存至 SQLite 資料庫的 CurrentWeather 表格中
    """
    if df.empty:
        print("沒有有效資料可以儲存")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 建立新的 CurrentWeather 表格
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS CurrentWeather (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            StationName TEXT,
            StationId TEXT,
            CountyName TEXT,
            ObsTime TEXT,
            AirTemperature REAL,
            Weather TEXT,
            Latitude REAL,
            Longitude REAL,
            UNIQUE(StationName, ObsTime) -- 防止同一個測站在同一時間重複寫入
        )
    ''')
    
    # 使用暫存表來處理 INSERT OR IGNORE
    df.to_sql('TempStage', conn, if_exists='replace', index=False)
    
    insert_sql = '''
        INSERT OR IGNORE INTO CurrentWeather 
        (StationName, StationId, CountyName, ObsTime, AirTemperature, Weather, Latitude, Longitude)
        SELECT StationName, StationId, CountyName, ObsTime, AirTemperature, Weather, Latitude, Longitude 
        FROM TempStage
    '''
    cursor.execute(insert_sql)
    
    # 清理暫存表
    cursor.execute("DROP TABLE IF EXISTS TempStage")
    
    conn.commit()
    conn.close()
    print(f"成功儲存 {len(df)} 筆觀測資料至 {db_path}")

if __name__ == "__main__":
    try:
        print("開始取得即時氣象觀測資料...")
        data = fetch_weather_data()
        
        print("解析資料中...")
        df = parse_weather_data(data)
        
        print("整理後的資料預覽：")
        print(df.head())
        
        print("儲存至資料庫...")
        save_to_sqlite(df)
        
        print("完成！")
    except Exception as e:
        print(f"發生錯誤: {e}")
