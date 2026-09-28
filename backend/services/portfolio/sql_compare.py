"""SQL 결과 CSV와 Pandas 결과 CSV 비교 — tests/integration 과 /validation API가 사용."""
from pathlib import Path
import pandas as pd


def compare(sql_csv: Path, pandas_csv: Path, keys: list[str], cols: list[str], tol: float = 0.01) -> dict:
    a, b = pd.read_csv(sql_csv, dtype={"ticker": str}), pd.read_csv(pandas_csv, dtype={"ticker": str})
    a.columns, b.columns = a.columns.str.lower(), b.columns.str.lower()
    for k in keys:
        if "date" in k:
            a[k] = pd.to_datetime(a[k]).dt.date.astype(str)
            b[k] = pd.to_datetime(b[k]).dt.date.astype(str)
    m = a.merge(b, on=keys, suffixes=("_sql", "_pd"), how="outer", indicator=True)
    missing = m.loc[m["_merge"] != "both", keys].values.tolist()
    max_diff, bad = {}, {}
    for c in cols:
        if f"{c}_sql" not in m or f"{c}_pd" not in m:
            bad[c] = "column missing"; continue
        d = (m[f"{c}_sql"] - m[f"{c}_pd"]).abs()
        max_diff[c] = float(d.max())
        if (d > tol).any():
            bad[c] = int((d > tol).sum())
    return {"pass": not missing and not bad, "max_diff": max_diff, "over_tol": bad, "missing_keys": missing}
