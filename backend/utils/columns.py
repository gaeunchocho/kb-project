"""원본 CSV 컬럼명 → 표준 컬럼명 매핑 (docs/api.md §1). 모든 로더가 이 함수를 거친다."""
import pandas as pd

RENAME = {
    "date": "trade_date", "stock_id": "ticker", "price": "close_price",
    "stock_name": "name", "portfolio_id": "position_id",
}


def normalize(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = df.columns.str.replace("﻿", "").str.strip().str.lower()
    df = df.rename(columns=RENAME)
    if "ticker" in df.columns:
        df["ticker"] = df["ticker"].astype(str)
    if "trade_date" in df.columns:
        df["trade_date"] = pd.to_datetime(df["trade_date"])
    return df


def read_csv(path) -> pd.DataFrame:
    return normalize(pd.read_csv(path, encoding="utf-8-sig", dtype={"stock_id": str, "ticker": str}))
