"""data/raw/*.csv 및 data/market/*.csv → data/portfolio.db (SQLite). 컬럼은 표준명으로 저장.
실행: python backend/utils/load_to_sqlite.py   →  이후 python backend/utils/run_sql.py sql/portfolio.sql
"""
import sqlite3
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from backend.utils.columns import read_csv

DATA = ROOT / "data"
TABLES = {  # 파일 → 테이블 (docs/api.md §1)
    DATA / "raw" / "06_portfolio.csv": "portfolio",
    DATA / "raw" / "06_stock_prices.csv": "stock_prices",
    DATA / "market" / "index.csv": "market_index",
    DATA / "market" / "gold.csv": "market_gold",
    DATA / "market" / "carbon.csv": "market_carbon",
}
db = sqlite3.connect(DATA / "portfolio.db")
for csv, table in TABLES.items():
    if not csv.exists():
        print(f"(없음) {csv.relative_to(ROOT)} → {table} 건너뜀"); continue
    df = read_csv(csv)
    if "trade_date" in df.columns:
        df["trade_date"] = df["trade_date"].dt.strftime("%Y-%m-%d")
    df.to_sql(table, db, if_exists="replace", index=False)
    print(f"{csv.name} → 테이블 {table} ({len(df)} rows, cols={list(df.columns)})")
db.close()
