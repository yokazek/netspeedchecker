import speedtest
from database import save_result
import logging

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("netchecker.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

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
