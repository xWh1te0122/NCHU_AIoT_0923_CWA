"""
collector.py — CWA 自動氣象站觀測資料收集器
- 每 10 分鐘自動抓取 O-A0001-001，存入 SQLite
- 每天清理 30 天以前的舊資料
- 提供 get_collector_status() 供 API 查詢
"""

import os
import sqlite3
import logging
import threading
from datetime import datetime, timezone, timedelta

import requests as req_lib

# ── 設定值 ───────────────────────────────────────────────
FETCH_INTERVAL_SECONDS = 10 * 60      # 每 10 分鐘抓一次
RETENTION_DAYS         = 30           # 保留最近 30 天
CLEANUP_INTERVAL_HOURS = 24           # 每 24 小時清理一次
INVALID_SENTINELS      = {-99, -999}  # CWA 無效值

# ── 狀態紀錄（thread-safe）───────────────────────────────
_status_lock = threading.Lock()
_collector_status = {
    "last_success_at":   None,
    "last_written_rows": 0,
    "last_error_at":     None,
    "last_error_msg":    "",
}

# ── Logging ──────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("collector")


# ════════════════════════════════════════════════════════
# 資料庫工具
# ════════════════════════════════════════════════════════

def _db_path() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """建立 stations / observations 資料表（若不存在）並建立索引。"""
    conn = get_db_connection()
    with conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS stations (
                station_id   TEXT PRIMARY KEY,
                name         TEXT,
                county       TEXT,
                town         TEXT,
                lat          REAL,
                lon          REAL,
                altitude     REAL,
                updated_at   TEXT
            );

            CREATE TABLE IF NOT EXISTS observations (
                station_id   TEXT    NOT NULL,
                obs_time     TEXT    NOT NULL,
                temp         REAL,
                humidity     REAL,
                wind_speed   REAL,
                wind_dir     REAL,
                pressure     REAL,
                precip_now   REAL,
                PRIMARY KEY (station_id, obs_time)
            );

            CREATE INDEX IF NOT EXISTS idx_obs_time
                ON observations(obs_time);
        """)
    conn.close()
    logger.info("資料庫初始化完成（WAL 模式）。")


# ════════════════════════════════════════════════════════
# 資料清理
# ════════════════════════════════════════════════════════

def cleanup_old_observations():
    """刪除 RETENTION_DAYS 天以前的觀測資料。"""
    cutoff = (
        datetime.now(timezone(timedelta(hours=8)))
        - timedelta(days=RETENTION_DAYS)
    ).strftime("%Y-%m-%dT%H:%M:%S+08:00")
    try:
        conn = get_db_connection()
        with conn:
            cur = conn.execute(
                "DELETE FROM observations WHERE obs_time < ?", (cutoff,)
            )
            deleted = cur.rowcount
        conn.close()
        logger.info("清理完成：刪除 %d 筆 %d 天前資料（cutoff=%s）", deleted, RETENTION_DAYS, cutoff)
    except Exception as e:
        logger.error("清理舊資料失敗：%s", e)


# ════════════════════════════════════════════════════════
# 資料解析工具
# ════════════════════════════════════════════════════════

def _safe_float(val):
    """將值轉為 float；無效值（-99, -999 等）或轉換失敗回傳 None。"""
    if val is None:
        return None
    try:
        v = float(val)
    except (TypeError, ValueError):
        return None
    if int(v) in INVALID_SENTINELS:
        return None
    return v


def _parse_station(s):
    """解析單一測站的基本資料。失敗回傳 None。"""
    coords = s.get("GeoInfo", {}).get("Coordinates", [])
    wgs84 = next(
        (c for c in coords if c.get("CoordinateName") == "WGS84"),
        coords[0] if coords else None,
    )
    if not wgs84:
        return None

    try:
        lat = float(wgs84["StationLatitude"])
        lon = float(wgs84["StationLongitude"])
    except (KeyError, TypeError, ValueError):
        return None

    alt    = _safe_float(s.get("GeoInfo", {}).get("StationAltitude"))
    county = s.get("GeoInfo", {}).get("CountyName", "")
    town   = s.get("GeoInfo", {}).get("TownName", "")

    return {
        "station_id": s.get("StationId", ""),
        "name":       s.get("StationName", ""),
        "county":     county,
        "town":       town,
        "lat":        lat,
        "lon":        lon,
        "altitude":   alt,
    }


def _parse_observation(s, station_id):
    """解析單一測站的觀測資料。失敗回傳 None。"""
    obs_time = s.get("ObsTime", {}).get("DateTime", "")
    if not obs_time:
        return None

    we = s.get("WeatherElement", {})

    temp       = _safe_float(we.get("AirTemperature"))
    humidity   = _safe_float(we.get("RelativeHumidity"))
    wind_speed = _safe_float(we.get("WindSpeed"))
    wind_dir   = _safe_float(we.get("WindDirection"))
    pressure   = _safe_float(we.get("AirPressure"))

    # 當日累積雨量（欄位位置因 CWA 資料版本而異）
    now_elem   = we.get("Now")
    precip_now = None
    if isinstance(now_elem, dict):
        precip_now = _safe_float(now_elem.get("Precipitation"))
    if precip_now is None:
        precip_now = _safe_float(we.get("DailyPrecipitation"))

    # 合理性過濾
    if temp       is not None and not (-20 <= temp       <= 60):   temp       = None
    if humidity   is not None and not (  0 <= humidity   <= 100):  humidity   = None
    if wind_speed is not None and not (  0 <= wind_speed <= 80):   wind_speed = None
    if pressure   is not None and not (850 <= pressure   <= 1100): pressure   = None

    return {
        "station_id": station_id,
        "obs_time":   obs_time,
        "temp":       temp,
        "humidity":   humidity,
        "wind_speed": wind_speed,
        "wind_dir":   wind_dir,
        "pressure":   pressure,
        "precip_now": precip_now,
    }


# ════════════════════════════════════════════════════════
# 主要抓取函式
# ════════════════════════════════════════════════════════

def _now_iso():
    return datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%dT%H:%M:%S+08:00")


def load_env():
    """載入 .env（兼容 Vercel / local）。"""
    try:
        from dotenv import load_dotenv
        load_dotenv(override=True)
    except ImportError:
        pass


def fetch_and_store():
    """
    從 CWA 抓取 O-A0001-001，寫入 stations / observations。
    使用 INSERT OR IGNORE 去重；整批包在一個 transaction。
    """
    global _collector_status

    load_env()
    api_key = os.getenv("CWA_API_KEY", "")
    if not api_key:
        logger.error("CWA_API_KEY 未設定，略過本次抓取。")
        return

    cwa_url = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001"
    logger.info("開始抓取 CWA 資料…")

    try:
        r = req_lib.get(cwa_url, params={"Authorization": api_key}, timeout=20)
        r.raise_for_status()
        raw = r.json()
    except Exception as e:
        msg = f"HTTP 請求失敗：{e}"
        logger.error(msg)
        with _status_lock:
            _collector_status["last_error_at"]  = _now_iso()
            _collector_status["last_error_msg"] = msg
        return

    if raw.get("success") != "true":
        msg = "CWA API 回傳 success!=true"
        logger.error(msg)
        with _status_lock:
            _collector_status["last_error_at"]  = _now_iso()
            _collector_status["last_error_msg"] = msg
        return

    station_list = raw.get("records", {}).get("Station", [])
    if not station_list:
        logger.warning("CWA 回傳測站清單為空。")
        return

    now_iso = _now_iso()
    written = 0

    try:
        conn = get_db_connection()
        with conn:
            for s in station_list:
                station_data = _parse_station(s)
                if not station_data:
                    continue

                sid = station_data["station_id"]

                # ── 測站基本資料（有變動才更新）──
                conn.execute("""
                    INSERT INTO stations
                        (station_id, name, county, town, lat, lon, altitude, updated_at)
                    VALUES (?,?,?,?,?,?,?,?)
                    ON CONFLICT(station_id) DO UPDATE SET
                        name       = excluded.name,
                        county     = excluded.county,
                        town       = excluded.town,
                        lat        = excluded.lat,
                        lon        = excluded.lon,
                        altitude   = excluded.altitude,
                        updated_at = excluded.updated_at
                    WHERE
                        stations.name    != excluded.name   OR
                        stations.county  != excluded.county OR
                        stations.town    != excluded.town   OR
                        stations.lat     != excluded.lat    OR
                        stations.lon     != excluded.lon    OR
                        stations.altitude IS DISTINCT FROM excluded.altitude
                """, (
                    sid,
                    station_data["name"],
                    station_data["county"],
                    station_data["town"],
                    station_data["lat"],
                    station_data["lon"],
                    station_data["altitude"],
                    now_iso,
                ))

                # ── 觀測資料（主鍵去重）──
                obs = _parse_observation(s, sid)
                if not obs:
                    continue

                cur = conn.execute("""
                    INSERT OR IGNORE INTO observations
                        (station_id, obs_time, temp, humidity,
                         wind_speed, wind_dir, pressure, precip_now)
                    VALUES (?,?,?,?,?,?,?,?)
                """, (
                    obs["station_id"],
                    obs["obs_time"],
                    obs["temp"],
                    obs["humidity"],
                    obs["wind_speed"],
                    obs["wind_dir"],
                    obs["pressure"],
                    obs["precip_now"],
                ))
                written += cur.rowcount

        conn.close()
        logger.info("本次寫入 %d 筆觀測資料（共解析 %d 站）。", written, len(station_list))

        with _status_lock:
            _collector_status["last_success_at"]  = now_iso
            _collector_status["last_written_rows"] = written

    except Exception as e:
        msg = f"寫入資料庫失敗：{e}"
        logger.error(msg)
        with _status_lock:
            _collector_status["last_error_at"]  = _now_iso()
            _collector_status["last_error_msg"] = msg


# ════════════════════════════════════════════════════════
# 排程啟動
# ════════════════════════════════════════════════════════

_scheduler_started = False
_scheduler_lock    = threading.Lock()


def start_scheduler():
    """
    啟動背景排程（APScheduler BackgroundScheduler）。
    防止 Flask debug reloader 啟動兩次。
    """
    global _scheduler_started

    # Flask debug=True 會啟動兩個程序（reloader + 主程序）；
    # 只在 WERKZEUG_RUN_MAIN=true（主程序）時啟動排程。
    flask_debug = os.environ.get("FLASK_DEBUG", "0") == "1" or os.environ.get("WERKZEUG_RUN_MAIN") is not None
    is_reloader_child = os.environ.get("WERKZEUG_RUN_MAIN") == "true"

    if flask_debug and not is_reloader_child:
        # 這是 reloader 父程序，跳過排程
        logger.info("偵測到 Flask reloader 父程序，略過排程啟動。")
        return

    with _scheduler_lock:
        if _scheduler_started:
            return
        _scheduler_started = True

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except ImportError:
        logger.error("APScheduler 未安裝，請執行 pip install apscheduler。")
        return

    init_db()

    scheduler = BackgroundScheduler(timezone="Asia/Taipei")

    # 立即在獨立執行緒執行一次（不阻塞啟動）
    t = threading.Thread(target=fetch_and_store, daemon=True, name="collector-init")
    t.start()

    # 每 10 分鐘抓取
    scheduler.add_job(
        fetch_and_store,
        trigger="interval",
        seconds=FETCH_INTERVAL_SECONDS,
        id="fetch_cwa",
        max_instances=1,
        coalesce=True,
    )

    # 每 24 小時清理舊資料
    scheduler.add_job(
        cleanup_old_observations,
        trigger="interval",
        hours=CLEANUP_INTERVAL_HOURS,
        id="cleanup_obs",
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()
    logger.info(
        "排程已啟動：每 %d 分鐘抓取，每 %d 小時清理。",
        FETCH_INTERVAL_SECONDS // 60,
        CLEANUP_INTERVAL_HOURS,
    )


# ════════════════════════════════════════════════════════
# 狀態查詢（供 API 使用）
# ════════════════════════════════════════════════════════

def get_collector_status():
    """回傳收集器狀態，加上資料庫統計資訊。"""
    with _status_lock:
        status = dict(_collector_status)

    try:
        conn = get_db_connection()
        row = conn.execute(
            "SELECT COUNT(*) as total, MIN(obs_time) as oldest, MAX(obs_time) as newest "
            "FROM observations"
        ).fetchone()
        station_count = conn.execute("SELECT COUNT(*) as cnt FROM stations").fetchone()
        conn.close()
        status["db_total_rows"]    = row["total"]
        status["db_oldest_obs"]    = row["oldest"]
        status["db_newest_obs"]    = row["newest"]
        status["db_station_count"] = station_count["cnt"]
    except Exception as e:
        status["db_error"] = str(e)

    return status
