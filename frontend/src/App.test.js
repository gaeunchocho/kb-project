import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  global.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {
      this.callback([{ contentRect: { width: 800, height: 320 } }]);
    }

    disconnect() {}

    unobserve() {}
  };

  global.fetch = jest.fn((url) => {
    const path = String(url);
    if (path.includes("/portfolio/valuation")) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          {
            ticker: "S06_001",
            name: "테스트, 종목",
            quantity: 2,
            buy_price: 100,
            close_price: 120,
            eval_amount: 240,
            pnl: 40,
            pnl_pct: 20,
            weight_pct: 100,
          },
        ],
      });
    }
    if (path.includes("/portfolio/top-bottom")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          top: [{ ticker: "S06_001", name: "테스트, 종목", pnl_pct: 20, eval_amount: 240 }],
          bottom: [{ ticker: "S06_002", name: "하위 종목", pnl_pct: -10, eval_amount: 90 }],
        }),
      });
    }
    if (path.includes("/market/summary")) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          {
            index_name: "SYNTH_KOSPI",
            mean: 1000,
            max: 1100,
            min: 900,
            max_date: "2025-01-02",
            min_date: "2025-01-03",
            daily_vol: 1.2,
          },
        ],
      });
    }

    const filename = path.split("/").pop().split("?")[0];
    const csv = {
      "pandas_C_valuation.csv":
        "ticker,name,quantity,buy_price,close_price,eval_amount,pnl,pnl_pct,weight_pct\nS06_001,\"테스트, 종목\",2,100,120,240,40,20,100\n",
      "pandas_C_top_bottom.csv":
        "ticker,name,pnl_pct,eval_amount,rank\nS06_001,\"테스트, 종목\",20,240,top\nS06_002,하위 종목,-10,90,bottom\n",
      "pandas_D_daily_total.csv": "trade_date,total_eval,diff_pct\n2025-01-02,240,\n",
      "pandas_E_index_summary.csv":
        "index_name,mean,max,min,max_date,min_date,daily_vol\nSYNTH_KOSPI,1000,1100,900,2025-01-02,2025-01-03,1.2\n",
      "pandas_D_vs_index.csv":
        "trade_date,port_pct,index_pct,excess_pct\n2025-01-02,1,0.5,0.5\n",
      "pandas_D_index_shock_days.csv":
        "trade_date,index_pct,port_pct,direction\n2025-01-02,0.5,1,same\n",
    }[filename];

    return Promise.resolve(
      csv === undefined
        ? { ok: false, status: 404, text: async () => "" }
        : { ok: true, status: 200, text: async () => csv }
    );
  });
});

test("renders dashboard title", async () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "포트폴리오 · 시장 지표" })).toBeInTheDocument();
  expect((await screen.findAllByText("테스트, 종목")).length).toBe(2);
  expect(await screen.findByText("데이터 불러옴")).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith("/portfolio/valuation");
  expect(global.fetch).toHaveBeenCalledWith("/portfolio/top-bottom?n=3");
  expect(global.fetch.mock.calls.some(([url]) => String(url).startsWith("/health"))).toBe(false);
});

test("re-reads static CSV files when refresh is clicked", async () => {
  render(<App />);
  await screen.findAllByText("테스트, 종목");
  await waitFor(() =>
    expect(
      global.fetch.mock.calls.filter(([url]) => String(url).includes("/portfolio/valuation"))
    ).toHaveLength(1)
  );

  fireEvent.click(screen.getByRole("button", { name: "데이터 다시 불러오기" }));

  await waitFor(() =>
    expect(
      global.fetch.mock.calls.filter(([url]) => String(url).includes("/portfolio/valuation"))
    ).toHaveLength(2)
  );
});

test("shows market summary from a static CSV without calling the backend", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "시장 지표 (C)" }));

  expect(await screen.findByText("SYNTH_KOSPI")).toBeInTheDocument();
  expect((await screen.findAllByText("2025-01-02")).length).toBeGreaterThan(0);
  expect(global.fetch).toHaveBeenCalledWith("/market/summary");
  expect(global.fetch).toHaveBeenCalledWith(
    "/outputs/pandas_D_vs_index.csv",
    { cache: "no-store" }
  );
  expect(global.fetch.mock.calls.every(([url]) => !String(url).startsWith("/health"))).toBe(true);
});

test("handles a missing shock-days CSV without crashing the market page", async () => {
  global.fetch.mockImplementation((url) => {
    const filename = String(url).split("/").pop();
    if (filename === "pandas_D_index_shock_days.csv") {
      return Promise.resolve({ ok: false, status: 404, text: async () => "" });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      text: async () =>
        filename === "pandas_E_index_summary.csv"
          ? "index_name,mean,max,min,max_date,min_date,daily_vol\nSYNTH_KOSPI,1000,1100,900,2025-01-02,2025-01-03,1.2\n"
          : "trade_date,total_eval,close_value,port_pct,index_pct,excess_pct,rel_strength\n2025-01-02,240,1000,1,0.5,0.5,1\n",
    });
  });

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "시장 지표 (C)" }));

  expect(await screen.findByText(/pandas_D_index_shock_days\.csv을 찾을 수 없습니다/)).toBeInTheDocument();
});
