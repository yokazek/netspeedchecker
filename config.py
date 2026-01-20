import os

# --- Database & Files ---
DB_PATH = "netchecker.db"

# --- Measurement Settings ---
# 測定間隔 (1時間ごとに計測する場合は hours=1, 30分ごとの場合は minutes=30)
CHECK_INTERVAL = {"minutes": 20}

# --- Server Settings ---
HOST = "0.0.0.0"
PORT = 8080

# --- Static Directories ---
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(ROOT_DIR, "static")
