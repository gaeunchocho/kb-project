const API_BASE = process.env.REACT_APP_API_BASE || "";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getJson(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch (err) {
    throw new ApiError(
      "백엔드에 연결할 수 없습니다. uvicorn이 실행 중인지 확인하세요.",
      0
    );
  }

  if (!response.ok) {
    const raw = await response.text();
    let detail = `요청 실패 (${response.status})`;
    try {
      const body = JSON.parse(raw);
      if (body && body.detail) {
        detail = Array.isArray(body.detail) ? JSON.stringify(body.detail) : body.detail;
      }
    } catch {
      if (response.status >= 500) {
        detail =
          "백엔드 API(http://127.0.0.1:8000)에 연결하지 못했습니다. 프로젝트 루트에서 `python -m uvicorn backend.main:app --reload` 를 실행하세요.";
      }
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}

export function getHealth() {
  return getJson("/health");
}

export function getValuation() {
  return getJson("/portfolio/valuation");
}

export function getTopBottom(n = 3) {
  return getJson(`/portfolio/top-bottom?n=${n}`);
}

export function getDaily() {
  return getJson("/portfolio/daily");
}

export function getMarketSummary() {
  return getJson("/market/summary");
}

export function getVsIndex() {
  return getJson("/market/vs-index");
}

export function getShockDays(n = 5) {
  return getJson(`/market/shock-days?n=${n}`);
}

export function getBriefing() {
  return getJson("/briefing");
}

export function getValidation() {
  return getJson("/validation");
}
