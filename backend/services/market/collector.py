"""C. 시장 지표 수집 — docs/api.md §2 인터페이스.

금융위원회 '지수시세정보' API(GetMarketIndexInfoService_V2)로 코스피/코스닥 종가를 가져온다.
API 키가 없거나 호출에 실패하면 stock_prices 전 종목 평균(첫날=1000)으로 가상 지수(SYNTH_KOSPI)를
만들어 파이프라인이 끊기지 않게 한다.

환경변수: DATA_GO_KR_KEY (data.go.kr 일반인증키, Decoding 버전)
실행: python -m backend.services.market.collector            # data/market/index.csv 생성 (이미 있으면 스킵, --force로 재생성)
컬럼: trade_date, index_name, close_value
"""
import os
import sys
from pathlib import Path

import pandas as pd

DATA = Path(__file__).resolve().parents[3] / "data"
OUT = DATA / "market" / "index.csv"

API_BASE = "https://apis.data.go.kr/1160100/GetMarketIndexInfoService_V2"
API_OPERATION = "getStockMarketIndex_V2"
INDEX_NAMES = ["코스피", "코스닥"]


def fetch_index(start: str, end: str) -> pd.DataFrame | None:
    """금융위원회 지수시세정보 API에서 기준일자 구간의 코스피/코스닥 종가를 가져온다."""
    key = os.getenv("DATA_GO_KR_KEY")
    if not key:
        print("[api] DATA_GO_KR_KEY 없음 → 대체 경로")
        return None
    try:
        import requests
        url = f"{API_BASE}/{API_OPERATION}"
        rows = []
        for name in INDEX_NAMES:
            r = requests.get(url, params={
                "serviceKey": key, "resultType": "json", "numOfRows": 1000, "pageNo": 1,
                "beginBasDt": start, "endBasDt": end, "idxNm": name}, timeout=15)
            r.raise_for_status()
            body = r.json()["response"]["body"]
            items = (body.get("items") or {}).get("item") or []
            if isinstance(items, dict):
                items = [items]
            for it in items:
                rows.append((pd.to_datetime(it["basDt"]).date(), it["idxNm"], float(it["clpr"])))
        df = pd.DataFrame(rows, columns=["trade_date", "index_name", "close_value"])
        print(f"[api] {len(df)} rows")
        return df if len(df) else None
    except Exception as e:
        print(f"[api] 실패: {e} → 대체 경로")
        return None


def synthetic_index(prices: pd.DataFrame) -> pd.DataFrame:
    """전 종목 종가 평균을 첫날=1000 기준으로 정규화한 가상 지수."""
    m = prices.groupby("trade_date")["close_price"].mean().sort_index()
    idx = (m / m.iloc[0] * 1000).round(2)
    df = idx.reset_index().rename(columns={"close_price": "close_value"})
    df["index_name"] = "SYNTH_KOSPI"
    print(f"[synthetic] {len(df)} rows (stock_prices 평균 기반)")
    return df[["trade_date", "index_name", "close_value"]]


def main():
    if OUT.exists() and "--force" not in sys.argv:
        print(f"{OUT.relative_to(DATA.parent)} 이미 있음. 다시 만들려면 --force")
        return
    sys.path.insert(0, str(DATA.parent))
    from backend.utils.columns import read_csv

    sp = read_csv(DATA / "raw" / "06_stock_prices.csv")
    sp["trade_date"] = sp["trade_date"].dt.date
    start, end = min(sp["trade_date"]).strftime("%Y%m%d"), max(sp["trade_date"]).strftime("%Y%m%d")

    df = fetch_index(start, end)
    if df is None:
        df = synthetic_index(sp)

    df.to_csv(OUT, index=False)
    print(f"→ {OUT.name} 저장. index_name: {sorted(df.index_name.unique())}")


if __name__ == "__main__":
    sys.exit(main())
