import speedtest
from database import save_result, add_log
import logging
from config import LOG_PATH

class SQLiteHandler(logging.Handler):
    """ロギングをSQLiteデータベースに記録するカスタムハンドラ"""
    def emit(self, record):
        try:
            log_entry = self.format(record)
            # タイムスタンプはDB側で付与されるため、メッセージのみを送る
            # 必要なら record.levelname などを個別に保存可能
            add_log(record.levelname, record.getMessage())
        except Exception:
            self.handleError(record)

# ロギング設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# フォーマット
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# SQLite ハンドラ
sqlite_handler = SQLiteHandler()
sqlite_handler.setFormatter(formatter)

# コンソールハンドラ
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)

logger.addHandler(sqlite_handler)
logger.addHandler(console_handler)

def run_speed_test():
    """ネットワーク速度を測定し、DBに保存する"""
    logger.info("Starting speed test...")
    try:
        st = speedtest.Speedtest()
        
        # 最適なサーバーを選択
        st.get_best_server()
        
        # ダウンロード速度 (bps -> Mbps)
        download_speed = st.download() / 1_000_000
        # アップロード速度 (bps -> Mbps)
        upload_speed = st.upload() / 1_000_000
        # Ping
        ping = st.results.ping

        logger.info(f"Test complete: Down: {download_speed:.2f} Mbps, Up: {upload_speed:.2f} Mbps, Ping: {ping:.2f} ms")
        
        # DBに保存
        save_result(download_speed, upload_speed, ping)
        
        return {
            "download": round(download_speed, 2),
            "upload": round(upload_speed, 2),
            "ping": round(ping, 2)
        }
    except Exception as e:
        logger.error(f"Error during speed test: {e}")
        # エラー時もタイムスタンプを残すために None を保存
        save_result(None, None, None)
        return None

if __name__ == "__main__":
    from database import init_db
    init_db()
    result = run_speed_test()
    print(result)
