"""F. 포트폴리오 계산 — docs/api.md §2. 포트폴리오는 '포지션'(같은 종목 여러 매수) 단위이므로 종목별로 집계한다."""
from pathlib import Path
import sys
import pandas as pd


def load_data(root: Path):
    sys.path.insert(0, str(root))
    from backend.utils.columns import read_csv
    pf = read_csv(root / "data" / "raw" / "06_portfolio.csv")
    sp = read_csv(root / "data" / "raw" / "06_stock_prices.csv")
    return pf, sp


def holdings(pf: pd.DataFrame) -> pd.DataFrame:
    """종목별 총수량·총매입금액·평균매입가 (포지션 SUM)."""
    pf = pf.assign(cost=pf["quantity"] * pf["buy_price"])
    h = pf.groupby("ticker", as_index=False).agg(name=("name", "first"), positions=("quantity", "size"),
                                                 quantity=("quantity", "sum"), cost_amount=("cost", "sum"))
    h["buy_price"] = (h["cost_amount"] / h["quantity"]).round(2)   # 가중평균 매입가
    return h


def latest_price(sp: pd.DataFrame) -> pd.DataFrame:
    return sp.sort_values("trade_date").groupby("ticker").tail(1)[["ticker", "trade_date", "close_price"]] \
             .rename(columns={"trade_date": "last_date"})


def valuation(pf: pd.DataFrame, sp: pd.DataFrame) -> pd.DataFrame:
    v = holdings(pf).merge(latest_price(sp)[["ticker", "close_price"]], on="ticker")
    v["eval_amount"] = (v["quantity"] * v["close_price"]).round(2)
    v["pnl"] = (v["eval_amount"] - v["cost_amount"]).round(2)
    v["pnl_pct"] = (v["pnl"] / v["cost_amount"] * 100).round(2)
    v["weight_pct"] = (v["eval_amount"] / v["eval_amount"].sum() * 100).round(2)
    return v.sort_values("pnl_pct", ascending=False).reset_index(drop=True)


def position_pnl(pf: pd.DataFrame, sp: pd.DataFrame) -> pd.DataFrame:
    """포지션 단위 손익 (어느 매수 건이 잘/못 됐나)."""
    p = pf.merge(latest_price(sp)[["ticker", "close_price"]], on="ticker")
    p["pnl"] = ((p["close_price"] - p["buy_price"]) * p["quantity"]).round(2)
    p["pnl_pct"] = ((p["close_price"] - p["buy_price"]) / p["buy_price"] * 100).round(2)
    return p.sort_values("pnl_pct", ascending=False).reset_index(drop=True)


def top_bottom(val: pd.DataFrame, n: int = 3) -> pd.DataFrame:
    return pd.concat([val.head(n).assign(rank="top"), val.tail(n).assign(rank="bottom")])


def daily_total(pf: pd.DataFrame, sp: pd.DataFrame) -> pd.DataFrame:
    m = sp.merge(holdings(pf)[["ticker", "quantity"]], on="ticker")
    m["eval"] = m["quantity"] * m["close_price"]
    d = m.groupby("trade_date", as_index=False)["eval"].sum().rename(columns={"eval": "total_eval"})
    d["total_eval"] = d["total_eval"].round(2)
    d["diff_amt"] = d["total_eval"].diff().round(2)
    d["diff_pct"] = (d["total_eval"].pct_change() * 100).round(2)
    return d
