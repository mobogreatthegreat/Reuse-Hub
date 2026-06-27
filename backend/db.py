import sqlite3
import json
import uuid
import os
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DATA_DIR / "hub.db"
JSON_PATH = DATA_DIR / "hub.json"


def ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_conn():
    ensure_data_dir()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    ensure_data_dir()
    conn = get_conn()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            path_or_url TEXT NOT NULL,
            browser TEXT DEFAULT '',
            icon TEXT DEFAULT '',
            category TEXT DEFAULT 'Uncategorized',
            created_at TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            console_mode TEXT DEFAULT 'terminal'
        )
    """)
    conn.commit()

    try:
        conn.execute("SELECT console_mode FROM items LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE items ADD COLUMN console_mode TEXT DEFAULT 'terminal'")
        conn.commit()

    try:
        conn.execute("INSERT INTO items (id,name,type,path_or_url,created_at) VALUES ('__test__','t','console','t','t')")
        conn.execute("DELETE FROM items WHERE id='__test__'")
    except sqlite3.DatabaseError:
        conn.execute("DROP TABLE IF EXISTS items_old")
        conn.execute("ALTER TABLE items RENAME TO items_old")
        conn.execute("""
            CREATE TABLE items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                path_or_url TEXT NOT NULL,
                browser TEXT DEFAULT '',
                icon TEXT DEFAULT '',
                category TEXT DEFAULT 'Uncategorized',
                created_at TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                console_mode TEXT DEFAULT 'terminal'
            )
        """)
        columns = ["id","name","type","path_or_url","browser","icon","category","created_at","sort_order"]
        try:
            conn.execute(f"SELECT console_mode FROM items_old LIMIT 1")
            columns.append("console_mode")
        except:
            pass
        col_str = ",".join(columns)
        conn.execute(f"INSERT INTO items ({col_str}) SELECT {col_str} FROM items_old")
        conn.execute("DROP TABLE items_old")
        conn.commit()

    conn.close()
    sync_to_json()


def all_items():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM items ORDER BY sort_order ASC, created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def categories():
    conn = get_conn()
    rows = conn.execute("SELECT DISTINCT category FROM items ORDER BY category").fetchall()
    conn.close()
    return [r["category"] for r in rows]


def add_item(data: dict) -> dict:
    item = {
        "id": str(uuid.uuid4()),
        "name": data["name"],
        "type": data["type"],
        "path_or_url": data["path_or_url"],
        "browser": data.get("browser", ""),
        "icon": data.get("icon", ""),
        "category": data.get("category", "Uncategorized"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sort_order": data.get("sort_order", 0),
        "console_mode": data.get("console_mode", "terminal"),
    }
    conn = get_conn()
    conn.execute(
        """INSERT INTO items (id,name,type,path_or_url,browser,icon,category,created_at,sort_order,console_mode)
           VALUES (:id,:name,:type,:path_or_url,:browser,:icon,:category,:created_at,:sort_order,:console_mode)""",
        item,
    )
    conn.commit()
    conn.close()
    sync_to_json()
    return item


def update_item(item_id: str, data: dict) -> dict | None:
    conn = get_conn()
    existing = conn.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone()
    if not existing:
        conn.close()
        return None
    allowed = ("name","type","path_or_url","browser","icon","category","sort_order","console_mode")
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        conn.close()
        return dict(existing)
    set_clause = ", ".join(f"{k}=?" for k in fields)
    values = list(fields.values()) + [item_id]
    conn.execute(f"UPDATE items SET {set_clause} WHERE id=?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone()
    conn.close()
    sync_to_json()
    return dict(row)


def delete_item(item_id: str) -> bool:
    conn = get_conn()
    cur = conn.execute("DELETE FROM items WHERE id=?", (item_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    if deleted:
        sync_to_json()
    return deleted


def reorder_items(ordered_ids: list[str]):
    conn = get_conn()
    for idx, item_id in enumerate(ordered_ids):
        conn.execute("UPDATE items SET sort_order=? WHERE id=?", (idx, item_id))
    conn.commit()
    conn.close()
    sync_to_json()


def sync_to_json():
    items = all_items()
    ensure_data_dir()
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({"items": items, "version": 2}, f, indent=2, ensure_ascii=False)


def import_from_json():
    if not JSON_PATH.exists():
        return
    conn = get_conn()
    count = conn.execute("SELECT COUNT(*) FROM items").fetchone()[0]
    if count > 0:
        conn.close()
        return
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    for item in data.get("items", []):
        item.setdefault("console_mode", "terminal")
        conn.execute(
            """INSERT OR IGNORE INTO items (id,name,type,path_or_url,browser,icon,category,created_at,sort_order,console_mode)
               VALUES (:id,:name,:type,:path_or_url,:browser,:icon,:category,:created_at,:sort_order,:console_mode)""",
            item,
        )
    conn.commit()
    conn.close()
