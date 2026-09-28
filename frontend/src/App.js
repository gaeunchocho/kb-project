import { useCallback, useState } from "react";
import MarketPage from "./pages/MarketPage";
import PortfolioPage from "./pages/PortfolioPage";
import "./App.css";

export default function App() {
  const [view, setView] = useState("portfolio");
  const [dataApiStatus, setDataApiStatus] = useState({ status: "loading", failed: 0, total: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

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
            <span className="badge badge-ok">정적 CSV 모드</span>
            <span
              className={
                dataApiStatus.status === "success"
                  ? "badge badge-ok"
                  : dataApiStatus.status === "loading"
                    ? "badge"
                    : "badge badge-fail"
              }
            >
              CSV{" "}
              {dataApiStatus.status === "loading"
                ? "불러오는 중"
                : dataApiStatus.status === "success"
                  ? "불러옴"
                  : `일부 없음 (${dataApiStatus.failed}/${dataApiStatus.total})`}
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

      <section className="panel">
        <h2>결과 파일 표시</h2>
        <p className="status">
          백엔드 API 호출 없이 기존 outputs 및 data CSV로 준비한 결과를 표시합니다. 데이터 다시 불러오기는
          현재 프론트에 복사된 CSV를 다시 읽습니다.
        </p>
      </section>

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
