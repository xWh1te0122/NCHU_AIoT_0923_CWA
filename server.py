from flask import Flask, jsonify, send_from_directory, request
import sqlite3
import os
import requests as req_lib

from collector import (
    get_db_connection,
    get_collector_status,
    start_scheduler,
    load_env,
)

app = Flask(__name__, static_folder='static')


# ════════════════════════════════════════════════════════
# Static / Index
# ════════════════════════════════════════════════════════

@app.route('/')
def index():
    return app.send_static_file('index.html')


# ════════════════════════════════════════════════════════
# Config（對前端暴露非機密金鑰）
# ════════════════════════════════════════════════════════

@app.route('/api/config')
def get_config():
    load_env()
    return jsonify({
        "status":        "success",
        "carto_api_key": os.getenv("CARTO_API_KEY", ""),
        "cwa_api_key":   os.getenv("CWA_API_KEY",   ""),
    })


# ════════════════════════════════════════════════════════
# Weather（天氣預報，讀 weather_forecasts 資料表）
# ════════════════════════════════════════════════════════

@app.route('/api/weather')
def get_weather():
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT w.*
            FROM weather_forecasts w
            INNER JOIN (
                SELECT location_name, MIN(forecast_start) as min_start
                FROM weather_forecasts
                GROUP BY location_name
            ) AS latest
              ON w.location_name = latest.location_name
             AND w.forecast_start = latest.min_start
        ''')
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"status": "success", "data": [dict(r) for r in rows]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/weather/all')
def get_weather_all():
    """回傳指定縣市的所有預報時段。"""
    location = request.args.get('location', '')
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        if location:
            cursor.execute(
                'SELECT * FROM weather_forecasts WHERE location_name=? ORDER BY forecast_start',
                (location,)
            )
        else:
            cursor.execute('SELECT * FROM weather_forecasts ORDER BY location_name, forecast_start')
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"status": "success", "data": [dict(r) for r in rows]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ════════════════════════════════════════════════════════
# Observations — 讀資料庫（每站最新一筆）
# ════════════════════════════════════════════════════════

@app.route('/api/observations')
def get_observations():
    """
    直接讀資料庫中每站最新一筆觀測，不再即時打 CWA API。
    由背景收集器（collector.py）每 10 分鐘更新資料庫。
    """
    try:
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT
                s.station_id  AS stationId,
                s.name        AS stationName,
                s.lat,
                s.lon,
                s.altitude,
                o.temp        AS airTemp,
                o.humidity,
                o.wind_speed  AS windSpeed,
                o.wind_dir    AS windDir,
                o.pressure,
                o.precip_now  AS precipNow,
                o.obs_time    AS obsTime
            FROM observations o
            JOIN stations s ON s.station_id = o.station_id
            WHERE o.obs_time = (
                SELECT MAX(o2.obs_time)
                FROM observations o2
                WHERE o2.station_id = o.station_id
            )
        """).fetchall()
        conn.close()

        data = [dict(r) for r in rows]
        return jsonify({
            "status": "success",
            "cached": True,
            "count":  len(data),
            "data":   data,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ════════════════════════════════════════════════════════
# History — 指定測站的歷史觀測資料
# ════════════════════════════════════════════════════════

@app.route('/api/stations/<station_id>/history')
def get_station_history(station_id):
    """
    GET /api/stations/<station_id>/history?hours=24
    回傳該站指定時間範圍內的觀測資料（最多 720 小時 = 30 天）。
    """
    try:
        hours = int(request.args.get('hours', 24))
    except ValueError:
        hours = 24
    hours = max(1, min(hours, 720))

    from datetime import datetime, timezone, timedelta
    cutoff = (
        datetime.now(timezone(timedelta(hours=8))) - timedelta(hours=hours)
    ).strftime("%Y-%m-%dT%H:%M:%S+08:00")

    try:
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT
                o.obs_time    AS obsTime,
                o.temp        AS airTemp,
                o.humidity,
                o.wind_speed  AS windSpeed,
                o.wind_dir    AS windDir,
                o.pressure,
                o.precip_now  AS precipNow
            FROM observations o
            WHERE o.station_id = ?
              AND o.obs_time   >= ?
            ORDER BY o.obs_time ASC
        """, (station_id, cutoff)).fetchall()

        station = conn.execute(
            "SELECT station_id, name, county, town, lat, lon, altitude FROM stations WHERE station_id=?",
            (station_id,)
        ).fetchone()
        conn.close()

        if station is None:
            return jsonify({"status": "error", "message": f"Station '{station_id}' not found"}), 404

        return jsonify({
            "status":    "success",
            "station":   dict(station),
            "hours":     hours,
            "count":     len(rows),
            "data":      [dict(r) for r in rows],
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ════════════════════════════════════════════════════════
# Collector Status
# ════════════════════════════════════════════════════════

@app.route('/api/system/collector-status')
def collector_status():
    """回傳最後一次成功抓取的時間、本次寫入筆數、資料庫統計。"""
    try:
        status = get_collector_status()
        return jsonify({"status": "success", "data": status})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ════════════════════════════════════════════════════════
# CWA Proxy（保留，前端地圖其他資料集仍可用）
# ════════════════════════════════════════════════════════

@app.route('/api/cwa/<path:dataset>')
def cwa_proxy(dataset):
    load_env()
    api_key = os.getenv("CWA_API_KEY", "")
    if not api_key:
        return jsonify({"success": "false", "error": "CWA_API_KEY not configured"}), 500

    params = {k: v for k, v in request.args.items() if k != 'Authorization'}
    params['Authorization'] = api_key

    cwa_url = f"https://opendata.cwa.gov.tw/api/v1/rest/datastore/{dataset}"
    try:
        r = req_lib.get(cwa_url, params=params, timeout=10)
        return (r.content, r.status_code, {'Content-Type': 'application/json'})
    except req_lib.RequestException as e:
        return jsonify({"success": "false", "error": str(e)}), 502


# ════════════════════════════════════════════════════════
# 啟動
# ════════════════════════════════════════════════════════

# 啟動背景收集排程（自動偵測 Flask reloader，不重複啟動）
start_scheduler()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
