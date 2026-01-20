import os

# --- Database & Files ---
# ラズパイで運用する場合、このパスを /tmp/network-speed-monitor.db などに変更するとRAMディスク上で動作し、SDカードを保護できます。
# 環境変数 NETWORK_SPEED_MONITOR_DB で上書きも可能です。
DB_PATH = os.getenv("NETWORK_SPEED_MONITOR_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "network-speed-monitor.db"))

# --- Measurement Settings ---
# 測定間隔 (1時間ごとに計測する場合は hours=1, 30分ごとの場合は minutes=30)
CHECK_INTERVAL = {"minutes": 20}

# --- Server Settings ---
HOST = "0.0.0.0"
PORT = 8080

# --- Static Directories ---
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(ROOT_DIR, "static")
