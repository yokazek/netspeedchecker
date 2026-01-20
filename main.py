from fastapi import FastAPI, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.background import BackgroundScheduler
import os

from database import init_db, get_history, get_history_by_date, clear_history, get_system_logs, clear_system_logs
from speedtest_manager import run_speed_test
from config import CHECK_INTERVAL, STATIC_DIR, HOST, PORT

app = FastAPI(title="Network Speed Monitor")

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
    """最新のログをDBから取得"""
    return {"logs": get_system_logs(100)}

@app.get("/api/status")
async def get_status():
    return {"status": "running", "scheduler": "active", "interval": str(CHECK_INTERVAL)}

@app.delete("/api/history")
async def delete_history():
    """履歴をすべて削除"""
    clear_history()
    return {"message": "All history deleted"}

@app.delete("/api/logs")
async def delete_logs():
    """ログをクリア"""
    clear_system_logs()
    return {"message": "Logs cleared"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
