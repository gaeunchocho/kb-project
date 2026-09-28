import { useCallback, useEffect, useState } from "react";
import { getBriefing, getHealth, getValidation } from "./api/client";
import AiBriefing from "./components/AiBriefing";
import MarketPage from "./pages/MarketPage";
import PortfolioPage from "./pages/PortfolioPage";
import "./App.css";

export default function App() {
  const [view, setView] = useState("portfolio");
  const [health, setHealth] = useState({ status: "loading" });
  const [dataApiStatus, setDataApiStatus] = useState({ status: "loading", failed: 0, total: 0 });
  const [briefing, setBriefing] = useState({ status: "loading" });
  const [validation, setValidation] = useState({ status: "loading" });
  const [reportOpen, setReportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setHealth({ status: "loading" });
      setBriefing({ status: "loading" });
      setValidation({ status: "loading" });
      const [healthRes, briefingRes, validationRes] = await Promise.allSettled([
        getHealth(),
        getBriefing(),
        getValidation(),
      ]);
      if (cancelled) return;

      setHealth(
        healthRes.status === "fulfilled"
          ? { status: "success", data: healthRes.value }
          : { status: "error", error: healthRes.reason?.message }
      );
      setBriefing(
        briefingRes.status === "fulfilled"
          ? { status: "success", text: briefingRes.value.text }
          : { status: "error", error: briefingRes.reason?.message }
      );
      setValidation(
        validationRes.status === "fulfilled"
          ? { status: "success", data: validationRes.value }
          : { status: "error", error: validationRes.reason?.message }
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const apiOk = health.status === "success" && health.data?.status === "ok";
  const validationPass = validation.status === "success" && validation.data?.pass === true;
  const reportDataApiStatus = useCallback((status) => {
    setDataApiStatus(status);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">금융 데이터랩</p>
          <h1>포트폴리오 · 시장 지표</h1>
        </div>
        <div className="header-actions">
          <div className="badges">
            <span className={apiOk ? "badge badge-ok" : "badge badge-fail"}>
              백엔드 {apiOk ? "연결됨" : health.status === "loading" ? "확인 중" : "끊김"}
            </span>
            <span
              className={
                dataApiStatus.status === "success"
                  ? "badge badge-ok"
                  : dataApiStatus.status === "loading"
                    ? "badge"
                    : "badge badge-fail"
              }
            >
              데이터 API{" "}
              {dataApiStatus.status === "loading"
                ? "확인 중"
                : dataApiStatus.status === "success"
                  ? "정상"
                  : `실패 ${dataApiStatus.failed}/${dataApiStatus.total}`}
            </span>
            <span className={validationPass ? "badge badge-ok" : "badge badge-fail"}>
              검증 {validation.status === "loading" ? "확인 중" : validationPass ? "PASS" : "FAIL"}
            </span>
          </div>
          <button
            type="button"
            className="refresh-button"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            데이터 다시 불러오기
          </button>
        </div>
      </header>

      <AiBriefing status={briefing.status} error={briefing.error} text={briefing.text} />

      {validation.status === "success" && validation.data?.report ? (
        <section className="panel">
          <button type="button" className="link-button" onClick={() => setReportOpen((v) => !v)}>
            {reportOpen ? "검증 리포트 접기" : "검증 리포트 보기"}
          </button>
          {reportOpen ? <pre className="report">{validation.data.report}</pre> : null}
        </section>
      ) : null}

      <nav className="tabs" aria-label="분석 화면">
        <button
          type="button"
          className={view === "portfolio" ? "tab active" : "tab"}
          onClick={() => setView("portfolio")}
        >
          포트폴리오 (F)
        </button>
        <button
          type="button"
          className={view === "market" ? "tab active" : "tab"}
          onClick={() => setView("market")}
        >
          시장 지표 (C)
        </button>
      </nav>

      {view === "portfolio" ? (
        <PortfolioPage refreshKey={refreshKey} onDataApiStatus={reportDataApiStatus} />
      ) : (
        <MarketPage refreshKey={refreshKey} onDataApiStatus={reportDataApiStatus} />
      )}
    </div>
  );
}
