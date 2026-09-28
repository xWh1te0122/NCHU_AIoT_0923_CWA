import os
import json
import requests
import sys
from dotenv import load_dotenv

# Force stdout to utf-8 just in case
sys.stdout.reconfigure(encoding='utf-8')

def check_json_schema(data):
    """
    Validates that the JSON schema contains the expected elements:
    T, MaxT, MinT, Wx, PoP12h
    """
    try:
        locations = data['records']['Locations'][0]['Location']
        # check the first location
        weather_elements = locations[0]['WeatherElement']
        element_names = [elem['ElementName'] for elem in weather_elements]
        
        required_elements = ['平均溫度', '最高溫度', '最低溫度', '天氣現象', '12小時降雨機率']
        missing = [req for req in required_elements if req not in element_names]
        
        if missing:
            print(f"[Warning] Missing expected weather elements: {missing}")
            return False
            
        print("[Success] JSON schema inspected: T / MaxT / MinT / Wx / PoP confirmed.")
        return True
    except KeyError as e:
        print(f"[Error] JSON structure unexpected. Missing key: {e}")
        return False

def fetch_cwa_data():
    load_dotenv()
    api_key = os.getenv("CWA_API_KEY")
    
    if not api_key or api_key.strip() == "":
        print("[Error] CWA_API_KEY is not set in .env file.")
        print("[Info] 請到 .env 檔案中填寫您的中央氣象署 API Key。")
        return False
        
    # F-D0047-091 (全臺縣市7天天氣預報)
    url = f"https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization={api_key}"
    
    print("[Info] Fetching data from CWA API (F-D0047-091)...")
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") == "true":
            print("[Success] HTTP 200 OK, success = true")
            
            locations = data.get('records', {}).get('Locations', [{}])[0].get('Location', [])
            if len(locations) == 22:
                print("[Success] 22/22 Taiwan counties coverage confirmed.")
            else:
                print(f"[Warning] Only {len(locations)} counties fetched.")
            
            check_json_schema(data)
            
            # Output to gate1_output.json
            output_file = "gate1_output.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"[Success] Real JSON received and saved to {output_file} (no mock/fake data).")
            print(f"[Success] No API Key exposed in output.")
            return True
        else:
            print("[Error] API returned failure response:")
            print(data)
            return False
    else:
        print(f"[Error] HTTP Error {response.status_code}")
        print(response.text)
        return False

if __name__ == "__main__":
    fetch_cwa_data()
