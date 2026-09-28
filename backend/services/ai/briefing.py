"""AI 브리핑 — outputs/*.csv 의 수치만으로 한국어 문장을 만든다 (LLM 없이 동작).
LLM 을 쓰는 경우 render() 결과를 프롬프트 근거로 넘기고, 생성문의 수치는 facts 와 대조해 ai_log.md 에 남긴다.
실행: python -m backend.services.ai.briefing
"""
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "outputs"


def _read(name):
    p = OUT / name
    return pd.read_csv(p) if p.exists() else None


def build_facts() -> dict:
    f = {}
    val = _read("pandas_C_valuation.csv")
    if val is not None:
        if "name" in val.columns:
            val["ticker"] = val["name"] + "(" + val["ticker"].astype(str).str.zfill(6) + ")"
        f["total_eval"] = float(val["eval_amount"].sum())
        f["total_pnl_pct"] = round(float((val["eval_amount"].sum() - val["cost_amount"].sum()) / val["cost_amount"].sum() * 100), 2)
        f["best"] = val.iloc[0][["ticker", "pnl_pct"]].to_dict()
        f["worst"] = val.iloc[-1][["ticker", "pnl_pct"]].to_dict()
        f["top_weight"] = val.sort_values("weight_pct", ascending=False).iloc[0][["ticker", "weight_pct"]].to_dict()
    vs = _read("pandas_D_vs_index.csv")
    if vs is not None and len(vs):
        last = vs.dropna().iloc[-1]
        f["last_date"] = str(last["trade_date"])[:10]
        f["last_port_pct"], f["last_index_pct"] = float(last["port_pct"]), float(last["index_pct"])
        f["cum_excess"] = round(float(vs["excess_pct"].sum()), 2)
        f["best_excess"] = vs.loc[vs["excess_pct"].idxmax(), ["trade_date", "excess_pct"]].to_dict()
        f["worst_excess"] = vs.loc[vs["excess_pct"].idxmin(), ["trade_date", "excess_pct"]].to_dict()
    sh = _read("pandas_D_index_shock_days.csv")
    if sh is not None and len(sh):
        f["shock_same_ratio"] = round(float((sh["direction"] == "same").mean() * 100), 0)
        f["shock_top"] = sh.iloc[0][["trade_date", "index_pct", "port_pct"]].to_dict()
    return f


def render(f: dict) -> str:
    if not f:
        return "브리핑 근거 파일(outputs/*.csv)이 없습니다. 노트북을 먼저 실행하세요."
    L = []
    if "last_date" in f:
        d = "상승" if f["last_index_pct"] > 0 else "하락"
        L.append(f"{f['last_date']} 기준 시장지수는 전일 대비 {f['last_index_pct']:+.2f}% {d}했고, "
                 f"포트폴리오는 {f['last_port_pct']:+.2f}% 움직였습니다.")
    if "total_eval" in f:
        L.append(f"포트폴리오 평가금액은 {f['total_eval']:,.0f}원, 누적 손익률은 {f['total_pnl_pct']:+.2f}%입니다. "
                 f"손익률 최상위는 {f['best']['ticker']}({f['best']['pnl_pct']:+.2f}%), "
                 f"최하위는 {f['worst']['ticker']}({f['worst']['pnl_pct']:+.2f}%)이며, "
                 f"비중이 가장 큰 종목은 {f['top_weight']['ticker']}({f['top_weight']['weight_pct']:.1f}%)입니다.")
    if "cum_excess" in f:
        L.append(f"기간 누적 초과수익률은 {f['cum_excess']:+.2f}%p이며, 초과수익이 가장 컸던 날은 "
                 f"{str(f['best_excess']['trade_date'])[:10]}({f['best_excess']['excess_pct']:+.2f}%p), "
                 f"가장 부진했던 날은 {str(f['worst_excess']['trade_date'])[:10]}({f['worst_excess']['excess_pct']:+.2f}%p)입니다.")
    if "shock_same_ratio" in f:
        L.append(f"지수 변동이 컸던 상위 5일 중 {f['shock_same_ratio']:.0f}%는 포트폴리오가 같은 방향으로 움직였습니다. "
                 f"가장 큰 변동일은 {str(f['shock_top']['trade_date'])[:10]}(지수 {f['shock_top']['index_pct']:+.2f}%, "
                 f"포트폴리오 {f['shock_top']['port_pct']:+.2f}%)입니다.")
    return "\n".join(L)


if __name__ == "__main__":
    print(render(build_facts()))
