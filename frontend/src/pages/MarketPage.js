import { useEffect, useState } from "react";
import { getMarketSummary, getShockDays, getVsIndex } from "../api/client";
import DataTable from "../components/DataTable";
import LineChart from "../components/LineChart";
import StatusMessage from "../components/StatusMessage";

const SUMMARY_COLUMNS = [
  { key: "index_name", label: "지수" },
  { key: "mean", label: "평균", format: "number" },
  { key: "max", label: "최대", format: "number" },
  { key: "min", label: "최소", format: "number" },
  { key: "max_date", label: "최고일", format: "date" },
  { key: "min_date", label: "최저일", format: "date" },
  { key: "daily_vol", label: "일간 변동성", format: "number" },
];

const SHOCK_COLUMNS = [
  { key: "trade_date", label: "일자", format: "date" },
  { key: "index_pct", label: "지수 변화율", format: "percent" },
  { key: "port_pct", label: "포트폴리오 변화율", format: "percent" },
  { key: "direction_label", label: "방향" },
];

function sectionState(result, isEmpty) {
  if (result.status === "rejected") {
    return { status: "error", error: result.reason?.message || "요청 실패" };
  }
  if (isEmpty(result.value)) {
    return { status: "empty" };
  }
  return { status: "success", data: result.value };
}

function withDirectionLabel(rows) {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => ({
    ...row,
    direction_label: row.direction === "same" ? "동일" : row.direction === "opposite" ? "반대" : row.direction,
  }));
}

export default function MarketPage({ refreshKey, onDataApiStatus }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ status: "loading" });
  const [vsIndex, setVsIndex] = useState({ status: "loading" });
  const [shock, setShock] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      onDataApiStatus({ status: "loading", failed: 0, total: 3 });
      const [sumRes, vsRes, shockRes] = await Promise.allSettled([
        getMarketSummary(),
        getVsIndex(),
        getShockDays(5),
      ]);
      if (cancelled) return;

      setSummary(sectionState(sumRes, (v) => !Array.isArray(v) || v.length === 0));
      setVsIndex(sectionState(vsRes, (v) => !Array.isArray(v) || v.length === 0));
      setShock(sectionState(shockRes, (v) => !Array.isArray(v) || v.length === 0));
      const failed = [sumRes, vsRes, shockRes].filter((result) => result.status === "rejected").length;
      onDataApiStatus({
        status: failed === 0 ? "success" : "error",
        failed,
        total: 3,
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, onDataApiStatus]);

  if (loading) {
    return <StatusMessage status="loading" />;
  }

  return (
    <div className="page">
      <section className="panel">
        <h2>지수 요약</h2>
        <StatusMessage
          status={summary.status}
          error={summary.error}
          emptyText="지수 요약 데이터가 없습니다."
        >
          <DataTable
            columns={SUMMARY_COLUMNS}
            rows={summary.data}
            rowKey={(row) => row.index_name}
          />
        </StatusMessage>
      </section>

      <section className="panel">
        <h2>포트폴리오 vs 지수</h2>
        <StatusMessage
          status={vsIndex.status}
          error={vsIndex.error}
          emptyText="비교 시계열 데이터가 없습니다."
        >
          <LineChart
            data={vsIndex.data}
            xKey="trade_date"
            series={[
              { key: "port_pct", name: "포트폴리오 %", color: "#5eead4" },
              { key: "index_pct", name: "지수 %", color: "#93c5fd" },
              { key: "excess_pct", name: "초과수익 %p", color: "#fbbf24" },
            ]}
          />
        </StatusMessage>
      </section>

      <section className="panel">
        <h2>지수 급변일</h2>
        <StatusMessage
          status={shock.status}
          error={shock.error}
          emptyText="급변일 데이터가 없습니다."
        >
          <DataTable
            columns={SHOCK_COLUMNS}
            rows={withDirectionLabel(shock.data)}
            rowKey={(row) => row.trade_date}
          />
        </StatusMessage>
      </section>
    </div>
  );
}
