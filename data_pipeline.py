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
# F-D0047-091 為台灣各縣市未來一週天氣預報
CWA_API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091"

def fetch_weather_data(api_key=CWA_API_KEY):
    """
    從中央氣象署取得未來一週天氣預報資料 (JSON)
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
    解析 JSON，提取各縣市每日最高溫 (MaxT) 與最低溫 (MinT)
    """
    records = []
    
    # 解析 CWA JSON 結構 (注意大小寫)
    locations_list = json_data.get('records', {}).get('Locations', [])
    if not locations_list:
        return pd.DataFrame()
        
    location_data = locations_list[0].get('Location', [])
    
    for loc in location_data:
        regionName = loc.get('LocationName')
        weatherElements = loc.get('WeatherElement', [])
        
        # 尋找最高溫度與最低溫度的 element
        max_t_elem = next((e for e in weatherElements if e.get('ElementName') == '最高溫度'), None)
        min_t_elem = next((e for e in weatherElements if e.get('ElementName') == '最低溫度'), None)
        
        if not max_t_elem or not min_t_elem:
            continue
            
        max_t_times = max_t_elem.get('Time', [])
        min_t_times = min_t_elem.get('Time', [])
        
        for i in range(min(len(max_t_times), len(min_t_times))):
            start_time = max_t_times[i].get('StartTime')
            # 轉換時間格式，取日期部分 (YYYY-MM-DD)
            if not start_time:
                continue
            dataDate = start_time.split("T")[0].split(" ")[0]
            
            try:
                # 取得數值 (第一個 value 通常就是溫度)
                maxt_vals = list(max_t_times[i].get('ElementValue', [{}])[0].values())
                mint_vals = list(min_t_times[i].get('ElementValue', [{}])[0].values())
                
                if maxt_vals and mint_vals:
                    maxt_val = float(maxt_vals[0])
                    mint_val = float(mint_vals[0])
                    
                    records.append({
                        'regionName': regionName,
                        'dataDate': dataDate,
                        'mint': mint_val,
                        'maxt': maxt_val
                    })
            except (ValueError, IndexError, TypeError):
                continue
                
    df = pd.DataFrame(records)
    # 同一天可能會有多筆資料 (白天/晚上)，我們可以取該日的最大值與最小值
    if not df.empty:
        df = df.groupby(['regionName', 'dataDate']).agg({'mint': 'min', 'maxt': 'max'}).reset_index()
        
    return df

def save_to_sqlite(df, db_path="data.db"):
    """
    將 DataFrame 儲存至 SQLite 資料庫的 TemperatureForecasts 表格中
    """
    if df.empty:
        print("沒有資料可以儲存")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 建立表格 (如果不存在)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS TemperatureForecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            regionName TEXT,
            dataDate TEXT,
            mint REAL,
            maxt REAL,
            UNIQUE(regionName, dataDate) -- 防止重複插入
        )
    ''')
    
    # 使用 OR IGNORE 來避免重複插入
    # 因為 pandas to_sql 不容易處理 UNIQUE 衝突，我們改用 iterrows 或是轉 dict
    # 或者用 pandas to_sql 的方式存入暫存表再 insert
    
    df.to_sql('TempStage', conn, if_exists='replace', index=False)
    
    insert_sql = '''
        INSERT OR IGNORE INTO TemperatureForecasts (regionName, dataDate, mint, maxt)
        SELECT regionName, dataDate, mint, maxt FROM TempStage
    '''
    cursor.execute(insert_sql)
    conn.commit()
    conn.close()
    print(f"成功儲存 {len(df)} 筆資料至 {db_path}")

if __name__ == "__main__":
    try:
        print("開始取得氣象資料...")
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
