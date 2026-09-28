import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    const path = String(url);
    if (path.includes("/health")) {
      return Promise.resolve({ ok: true, json: async () => ({ status: "ok" }) });
    }
    if (path.includes("/briefing")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ text: "테스트 브리핑입니다.", facts: {} }),
      });
    }
    if (path.includes("/validation")) {
      return Promise.resolve({ ok: true, json: async () => ({ pass: true, report: "PASS" }) });
    }
    if (path.includes("/portfolio/top-bottom")) {
      return Promise.resolve({ ok: true, json: async () => ({ top: [], bottom: [] }) });
    }
    return Promise.resolve({ ok: true, json: async () => [] });
  });
});

test("renders dashboard title", async () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "포트폴리오 · 시장 지표" })).toBeInTheDocument();
  expect(await screen.findByText("테스트 브리핑입니다.")).toBeInTheDocument();
  expect(await screen.findByText("데이터 API 정상")).toBeInTheDocument();
});

test("retries backend API requests when refresh is clicked", async () => {
  render(<App />);
  await screen.findByText("테스트 브리핑입니다.");
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
