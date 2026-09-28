from flask import Flask, jsonify, send_from_directory
import sqlite3
import os

app = Flask(__name__, static_folder='static')

def get_db_connection():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/config')
def get_config():
    from dotenv import load_dotenv
    load_dotenv(override=True)
    return jsonify({
        "status": "success",
        "carto_api_key": os.getenv("CARTO_API_KEY", "")
    })

@app.route('/api/weather')
def get_weather():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 取得每個縣市最接近現在時間的一筆預報資料 (最小的 forecast_start)
        cursor.execute('''
            SELECT w.*
            FROM weather_forecasts w
            INNER JOIN (
                SELECT location_name, MIN(forecast_start) as min_start
                FROM weather_forecasts
                GROUP BY location_name
            ) AS latest ON w.location_name = latest.location_name AND w.forecast_start = latest.min_start
        ''')
        rows = cursor.fetchall()
        conn.close()
        
        data = [dict(row) for row in rows]
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
