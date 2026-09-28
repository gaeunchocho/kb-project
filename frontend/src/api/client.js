export class DataFileError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "DataFileError";
    this.status = status;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header
  );
  return rows.slice(1).map((values) =>
    Object.fromEntries(
      headers.map((header, index) => {
        const value = values[index] ?? "";
        if (value === "") return [header, null];
        const number = Number(value);
        return [header, Number.isFinite(number) ? number : value];
      })
    )
  );
}

async function getCsv(name) {
  let response;
  try {
    response = await fetch(`/outputs/${name}`, { cache: "no-store" });
  } catch {
    throw new DataFileError(`정적 결과 파일을 불러오지 못했습니다: outputs/${name}`, 0);
  }

  if (!response.ok) {
    throw new DataFileError(
      `outputs/${name} 파일이 프론트엔드에 없습니다. 프로젝트 루트 outputs 폴더에 파일을 추가한 뒤 프론트엔드를 다시 시작하세요.`,
      response.status
    );
  }

  return parseCsv(await response.text());
}

export function getValuation() {
  return getCsv("pandas_C_valuation.csv");
}

export async function getTopBottom(n = 3) {
  const rows = await getCsv("pandas_C_top_bottom.csv");
  const top = rows.filter((row) => row.rank === "top").slice(0, n);
  const bottomRows = rows.filter((row) => row.rank === "bottom");
  return { top, bottom: bottomRows.slice(-n) };
}

export function getDaily() {
  return getCsv("pandas_D_daily_total.csv");
}

export function getMarketSummary() {
  return getCsv("pandas_E_index_summary.csv");
}

export function getVsIndex() {
  return getCsv("pandas_D_vs_index.csv");
}

export async function getShockDays(n = 5) {
  return (await getCsv("pandas_D_index_shock_days.csv")).slice(0, n);
}
