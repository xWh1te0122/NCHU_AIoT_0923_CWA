import json
import sqlite3
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def extract_elements(location_data):
    # This will return a dict of {start_time: {data...}}
    periods = {}
    
    for element in location_data.get('WeatherElement', []):
        name = element.get('ElementName')
        if name not in ['平均溫度', '最高溫度', '最低溫度', '天氣現象', '12小時降雨機率']:
            continue
            
        for time_block in element.get('Time', []):
            start = time_block.get('StartTime')
            end = time_block.get('EndTime')
            
            if start not in periods:
                periods[start] = {'start': start, 'end': end}
                
            value = time_block.get('ElementValue', [{}])[0]
            val = list(value.values())[0] if value else None
            
            if name == '平均溫度':
                periods[start]['avg_t'] = val
            elif name == '最高溫度':
                periods[start]['max_t'] = val
            elif name == '最低溫度':
                periods[start]['min_t'] = val
            elif name == '天氣現象':
                periods[start]['wx'] = val
            elif name == '12小時降雨機率':
                periods[start]['pop_12h'] = val
                
    return list(periods.values())

def run_etl():
    json_path = 'gate1_output.json'
    if not os.path.exists(json_path):
        print(f"[Error] {json_path} not found. Please run gate1.py first.")
        return False
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    locations = data.get('records', {}).get('Locations', [{}])[0].get('Location', [])
    if not locations:
        print("[Error] No locations found in JSON.")
        return False
        
    # Connect to SQLite
    db_path = 'data.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create table with UNIQUE constraint
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS weather_forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_name TEXT NOT NULL,
            forecast_start TEXT NOT NULL,
            forecast_end TEXT NOT NULL,
            avg_t TEXT,
            max_t TEXT,
            min_t TEXT,
            wx TEXT,
            pop_12h TEXT,
            UNIQUE(location_name, forecast_start)
        )
    ''')
    
    count = 0
    
    for loc in locations:
        loc_name = loc.get('LocationName')
        periods = extract_elements(loc)
        
        for p in periods:
            cursor.execute('''
                INSERT OR REPLACE INTO weather_forecasts 
                (location_name, forecast_start, forecast_end, avg_t, max_t, min_t, wx, pop_12h)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                loc_name,
                p.get('start'),
                p.get('end'),
                p.get('avg_t'),
                p.get('max_t'),
                p.get('min_t'),
                p.get('wx'),
                p.get('pop_12h', ' ')
            ))
            count += 1
            
    conn.commit()
    
    # Verify count
    cursor.execute('SELECT COUNT(*) FROM weather_forecasts')
    db_count = cursor.fetchone()[0]
    
    print(f"[Success] ETL completed. Processed {count} unique periods across {len(locations)} locations.")
    print(f"[Success] Total records in SQLite (data.db): {db_count}")
    
    if db_count == 308:
        print("[Success] Verified exactly 308 forecast records (22 locations x 14 periods).")
    else:
        print(f"[Warning] Expected 308 records but got {db_count}.")
        
    conn.close()
    return True

if __name__ == '__main__':
    run_etl()
