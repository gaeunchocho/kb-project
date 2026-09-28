import { useEffect, useState } from "react";
import { getDaily, getTopBottom, getValuation } from "../api/client";
import DataTable from "../components/DataTable";
import LineChart from "../components/LineChart";
import StatusMessage from "../components/StatusMessage";

const VALUATION_COLUMNS = [
  { key: "ticker", label: "종목코드" },
  { key: "name", label: "종목명" },
  { key: "quantity", label: "수량", format: "number" },
  { key: "buy_price", label: "매입가", format: "number" },
  { key: "close_price", label: "종가", format: "number" },
  { key: "eval_amount", label: "평가금액", format: "number" },
  { key: "pnl", label: "손익", format: "number" },
  { key: "pnl_pct", label: "손익률", format: "percent" },
  { key: "weight_pct", label: "비중", format: "percent" },
];

const RANK_COLUMNS = [
  { key: "ticker", label: "종목코드" },
  { key: "name", label: "종목명" },
  { key: "pnl_pct", label: "손익률", format: "percent" },
  { key: "eval_amount", label: "평가금액", format: "number" },
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

export default function PortfolioPage({ refreshKey, onDataApiStatus }) {
  const [loading, setLoading] = useState(true);
  const [valuation, setValuation] = useState({ status: "loading" });
  const [topBottom, setTopBottom] = useState({ status: "loading" });
  const [daily, setDaily] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      onDataApiStatus({ status: "loading", failed: 0, total: 3 });
      const [valRes, tbRes, dailyRes] = await Promise.allSettled([
        getValuation(),
        getTopBottom(3),
        getDaily(),
      ]);
      if (cancelled) return;

      setValuation(sectionState(valRes, (v) => !Array.isArray(v) || v.length === 0));
      setTopBottom(
        sectionState(tbRes, (v) => !v || ((!v.top || v.top.length === 0) && (!v.bottom || v.bottom.length === 0)))
      );
      setDaily(sectionState(dailyRes, (v) => !Array.isArray(v) || v.length === 0));
      const failed = [valRes, tbRes, dailyRes].filter((result) => result.status === "rejected").length;
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

  const topRows = topBottom.status === "success" ? topBottom.data.top || [] : [];
  const bottomRows = topBottom.status === "success" ? topBottom.data.bottom || [] : [];

  return (
    <div className="page">
      <section className="panel">
        <h2>종목별 평가 · 손익</h2>
        <StatusMessage
          status={valuation.status}
          error={valuation.error}
          emptyText="평가 결과 CSV가 없습니다. 노트북을 먼저 실행하세요."
        >
          <DataTable
            columns={VALUATION_COLUMNS}
            rows={valuation.data}
            rowKey={(row) => row.ticker}
          />
        </StatusMessage>
      </section>

      <section className="panel">
        <h2>손익률 상위 / 하위</h2>
        <StatusMessage
          status={topBottom.status}
          error={topBottom.error}
          emptyText="상위·하위 결과가 없습니다."
        >
          <div className="split">
            <div>
              <h3>상위</h3>
              {topRows.length === 0 ? (
                <StatusMessage status="empty" emptyText="상위 종목이 없습니다." />
              ) : (
                <DataTable columns={RANK_COLUMNS} rows={topRows} rowKey={(row) => `top-${row.ticker}`} />
              )}
            </div>
            <div>
              <h3>하위</h3>
              {bottomRows.length === 0 ? (
                <StatusMessage status="empty" emptyText="하위 종목이 없습니다." />
              ) : (
                <DataTable
                  columns={RANK_COLUMNS}
                  rows={bottomRows}
                  rowKey={(row) => `bottom-${row.ticker}`}
                />
              )}
            </div>
          </div>
        </StatusMessage>
      </section>

      <section className="panel">
        <h2>일자별 평가금액</h2>
        <StatusMessage
          status={daily.status}
          error={daily.error}
          emptyText="일별 총액 데이터가 없습니다."
        >
          <LineChart
            data={daily.data}
            xKey="trade_date"
            series={[{ key: "total_eval", name: "평가금액", color: "#5eead4" }]}
          />
        </StatusMessage>
      </section>
    </div>
  );
}
