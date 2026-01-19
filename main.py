from fastapi import FastAPI, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.background import BackgroundScheduler
import os

from database import init_db, get_history
from speedtest_manager import run_speed_test

app = FastAPI(title="NetChecker")

# --- 設定 ---
# 測定間隔 (1時間ごとに計測する場合は hours=1, 30分ごとの場合は minutes=30 と書けます)
CHECK_INTERVAL = {"minutes": 20} 
# -----------

# データベース初期化
init_db()

# スケジューラのセットアップ
scheduler = BackgroundScheduler()
scheduler.add_job(run_speed_test, 'interval', **CHECK_INTERVAL)
scheduler.start()

# 静的ファイルの提供
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.get("/history")
async def read_history():
    return FileResponse(os.path.join(static_dir, "history.html"))

@app.get("/api/history")
async def get_speed_history(limit: int = 50):
    return get_history(limit)

@app.get("/api/history/day")
async def get_speed_history_by_date(date: str):
    from database import get_history_by_date
    return get_history_by_date(date)

@app.post("/api/test")
async def trigger_speed_test(background_tasks: BackgroundTasks):
    """手動で速度測定を開始"""
    # 非同期で実行してすぐにレスポンスを返す
    background_tasks.add_task(run_speed_test)
    return {"message": "Speed test started in background"}

@app.get("/api/logs")
async def get_logs():
    """最新のログを返す"""
    if not os.path.exists("netchecker.log"):
        return {"logs": "ログファイルがまだ作成されていません。"}
    with open("netchecker.log", "r", encoding="utf-8") as f:
        # 直近の100行を返す
        lines = f.readlines()
        return {"logs": "".join(lines[-100:])}

@app.delete("/api/history")
async def delete_history():
    """履歴をすべて削除"""
    from database import clear_history
    clear_history()
    return {"message": "All history deleted"}

@app.delete("/api/logs")
async def delete_logs():
    """ログをクリア"""
    if os.path.exists("netchecker.log"):
        # ファイルを空にする
        with open("netchecker.log", "w", encoding="utf-8") as f:
            f.write("")
    return {"message": "Logs cleared"}

@app.get("/api/status")
async def get_status():
    """現在の状態を返す（必要に応じて拡張）"""
    return {"status": "running", "scheduler": "active", "interval": "1 hour"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
