import sqlite3
import os
from datetime import datetime

DB_PATH = "netchecker.db"

def init_db():
    """データベースとテーブルの初期化"""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS speed_tests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                download REAL,
                upload REAL,
                ping REAL
            )
        """)
        conn.commit()

def save_result(download: float, upload: float, ping: float):
    """測定結果を保存"""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO speed_tests (download, upload, ping) VALUES (?, ?, ?)",
            (download, upload, ping)
        )
        conn.commit()

def get_history(limit: int = 50):
    """履歴を取得"""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, timestamp, download, upload, ping FROM speed_tests ORDER BY timestamp DESC LIMIT ?",
            (limit,)
        )
        return [dict(row) for row in cursor.fetchall()]

def get_history_by_date(date_str: str):
    """指定した日付（YYYY-MM-DD）の履歴を取得"""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        # SQLiteのdate関数を使用して日付部分を比較
        cursor.execute(
            "SELECT id, timestamp, download, upload, ping FROM speed_tests WHERE date(timestamp) = date(?) ORDER BY timestamp ASC",
            (date_str,)
        )
        return [dict(row) for row in cursor.fetchall()]

def clear_history():
    """すべての履歴を削除"""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM speed_tests")
        conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
