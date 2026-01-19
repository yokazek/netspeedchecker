from fastapi import FastAPI, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.background import BackgroundScheduler
import os

from database import init_db, get_history, get_history_by_date, clear_history
from speedtest_manager import run_speed_test
from config import CHECK_INTERVAL, STATIC_DIR, HOST, PORT, LOG_PATH

app = FastAPI(title="NetChecker")

# データベース初期化
init_db()

# スケジューラのセットアップ
scheduler = BackgroundScheduler()
scheduler.add_job(run_speed_test, 'interval', **CHECK_INTERVAL)
scheduler.start()

# 静的ディレクトリの確保
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/history")
async def read_history():
    return FileResponse(os.path.join(STATIC_DIR, "history.html"))

# --- API Endpoints ---

@app.get("/api/history")
async def get_speed_history(limit: int = 50):
    return get_history(limit)

@app.get("/api/history/day")
async def get_speed_history_by_date(date: str, tz_offset: int = 9):
    return get_history_by_date(date, tz_offset)

@app.post("/api/test")
async def trigger_speed_test(background_tasks: BackgroundTasks):
    """手動で速度測定を開始"""
    background_tasks.add_task(run_speed_test)
    return {"message": "Speed test started in background"}

@app.get("/api/logs")
async def get_logs():
    """最新のログを返す"""
    if not os.path.exists(LOG_PATH):
        return {"logs": "ログファイルがまだ作成されていません。"}
    with open(LOG_PATH, "r", encoding="utf-8") as f:
        # 直近の100行を返す
        lines = f.readlines()
        return {"logs": "".join(lines[-100:])}

@app.delete("/api/history")
async def delete_history():
    """履歴をすべて削除"""
    clear_history()
    return {"message": "All history deleted"}

@app.delete("/api/logs")
async def delete_logs():
    """ログをクリア"""
    if os.path.exists(LOG_PATH):
        with open(LOG_PATH, "w", encoding="utf-8") as f:
            f.write("")
    return {"message": "Logs cleared"}

@app.get("/api/status")
async def get_status():
    return {"status": "running", "scheduler": "active", "interval": str(CHECK_INTERVAL)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
