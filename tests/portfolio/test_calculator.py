"""단위 테스트 — calculator.valuation / daily_total. 실행: python -m pytest tests -q"""
import pandas as pd
from backend.services.portfolio.calculator import valuation, daily_total, top_bottom


def _data():
    pf = pd.DataFrame({"position_id": ["p1", "p2", "p3"], "ticker": ["A", "A", "B"], "name": ["a", "a", "b"],
                       "quantity": [5, 5, 5], "buy_price": [90.0, 110.0, 200.0]})   # A는 두 포지션, 평균 100
    sp = pd.DataFrame({"trade_date": pd.to_datetime(["2026-01-02", "2026-01-03"] * 2),
                       "ticker": ["A", "A", "B", "B"], "close_price": [100.0, 110.0, 200.0, 180.0]})
    return pf, sp


def test_valuation_uses_latest_price():
    v = valuation(*_data()).set_index("ticker")
    assert v.loc["A", "eval_amount"] == 1100 and v.loc["A", "pnl_pct"] == 10.0
    assert v.loc["B", "pnl_pct"] == -10.0
    assert abs(v["weight_pct"].sum() - 100) < 0.01


def test_daily_total_and_diff():
    d = daily_total(*_data())
    assert list(d["total_eval"]) == [2000.0, 2000.0]
    assert d["diff_pct"].iloc[1] == 0.0


def test_top_bottom_rank():
    tb = top_bottom(valuation(*_data()), n=1)
    assert list(tb["rank"]) == ["top", "bottom"]
