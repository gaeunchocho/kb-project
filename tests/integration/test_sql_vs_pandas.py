"""
validation_F.py — 검증 담당
담당: (이름)   브랜치: <본인 github id>

역할:
  1. 원본 데이터 품질 체크 (결측, 중복, 이상값)
  2. SQL 결과 CSV vs Pandas 결과 CSV 교차검증
  3. 결과를 outputs/validation_report.md 로 남김

실행: python validation/validation_F.py
"""

from pathlib import Path
import sys
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
OUT = ROOT / "outputs"

# 교차검증 쌍: (SQL 결과, Pandas 결과, 키 컬럼, 비교 컬럼, 허용오차)
PAIRS = [
    ("sql_A_valuation.csv", "pandas_C_valuation.csv", ["ticker"], ["eval_amount", "pnl_pct"], 0.01),
    ("sql_B_daily_total.csv", "pandas_D_daily_total.csv", ["trade_date"], ["total_eval"], 0.01),
    ("sql_B_vs_index.csv", "pandas_D_vs_index.csv", ["trade_date"], ["port_pct", "index_pct", "excess_pct"], 0.02),
]

report = []


def log(msg: str):
    print(msg)
    report.append(msg)


def check_raw():
    log("## 1. 원본 데이터 품질")
    for name in ["raw/06_portfolio.csv", "raw/06_stock_prices.csv", "market/index.csv"]:
        p = DATA / name
        if not p.exists():
            log(f"- {name}: 파일 없음 (건너뜀)")
            continue
        df = pd.read_csv(p, encoding="utf-8-sig", dtype={"stock_id": str, "ticker": str})
        log(f"- {name}: {len(df)} rows, {df.shape[1]} cols")
        na = df.isna().sum()
        na = na[na > 0]
        log(f"  - 결측: {na.to_dict() if len(na) else '없음'}")
        log(f"  - 완전중복 행: {int(df.duplicated().sum())}")
        num = df.select_dtypes("number")
        if len(num.columns):
            q1, q3 = num.quantile(0.25), num.quantile(0.75)
            iqr = q3 - q1
            outl = ((num < q1 - 1.5 * iqr) | (num > q3 + 1.5 * iqr)).sum()
            outl = outl[outl > 0]
            log(f"  - IQR 이상값 후보: {outl.to_dict() if len(outl) else '없음'}")


def check_calendar():
    """stock_prices 와 market_index 의 거래일 집합이 일치하는지 (JOIN 누락 방지)."""
    log("\n## 1-2. 거래일 정합 (stock_prices vs market_index)")
    a, b = DATA / "raw" / "06_stock_prices.csv", DATA / "market" / "index.csv"
    if not a.exists() or not b.exists():
        log("- 파일 없음 → SKIP"); return
    _a = pd.read_csv(a, encoding="utf-8-sig"); sa = set(pd.to_datetime(_a["trade_date" if "trade_date" in _a else "date"]).dt.date)
    sb = set(pd.to_datetime(pd.read_csv(b)["trade_date"]).dt.date)
    only_a, only_b = sorted(sa - sb), sorted(sb - sa)
    log(f"- 시세에만 있는 날 {len(only_a)}개: {only_a[:5]}")
    log(f"- 지수에만 있는 날 {len(only_b)}개: {only_b[:5]}")
    log("- 결과: " + ("일치" if not only_a and not only_b else "불일치 → INNER JOIN 기준으로 통일, result_report 한계 절에 기재"))


def compare(sql_file, pd_file, keys, cols, tol):
    a, b = OUT / sql_file, OUT / pd_file
    if not a.exists() or not b.exists():
        log(f"- {sql_file} vs {pd_file}: 파일 없음 → SKIP")
        return None
    try:
        sa, sb = pd.read_csv(a, dtype={"ticker": str}), pd.read_csv(b, dtype={"ticker": str})
    except pd.errors.EmptyDataError:
        log(f"- {sql_file} vs {pd_file}: 빈 파일 있음 → FAIL")
        return False
    sa.columns, sb.columns = sa.columns.str.lower(), sb.columns.str.lower()
    for k in keys:  # 날짜 키 표기 통일 (2026-01-02 vs 2026-01-02 00:00:00)
        if "date" in k:
            sa[k] = pd.to_datetime(sa[k]).dt.date.astype(str)
            sb[k] = pd.to_datetime(sb[k]).dt.date.astype(str)
    m = sa.merge(sb, on=keys, suffixes=("_sql", "_pd"), how="outer", indicator=True)
    missing = m[m["_merge"] != "both"]
    ok = True
    if len(missing):
        ok = False
        log(f"  - 키 불일치 {len(missing)}건: {missing[keys].head().values.tolist()}")
    for c in cols:
        if f"{c}_sql" not in m or f"{c}_pd" not in m:
            ok = False
            log(f"  - {c}: 한쪽 파일에 컬럼 없음 → 컬럼명 확인")
            continue
        diff = (m[f"{c}_sql"] - m[f"{c}_pd"]).abs()
        bad = m[diff > tol]
        if len(bad):
            ok = False
            log(f"  - {c}: 허용오차 초과 {len(bad)}건 (최대 차이 {diff.max():.4f})")
        else:
            log(f"  - {c}: 일치 (최대 차이 {diff.max():.6f})")
    log(f"- {sql_file} vs {pd_file}: {'PASS' if ok else 'FAIL'}")
    return ok


def main():
    check_raw()
    check_calendar()
    log("\n## 2. SQL vs Pandas 교차검증")
    results = [compare(*p) for p in PAIRS]
    (OUT / "validation_report.md").write_text("\n".join(report), encoding="utf-8")
    if any(r is False for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
