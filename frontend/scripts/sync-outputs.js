const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const outputsDirectory = path.join(projectRoot, "outputs");
const dataDirectory = path.join(projectRoot, "data");
const publicDirectory = path.join(projectRoot, "frontend", "public", "outputs");

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
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Math.sign(value) * Number.EPSILON) * factor) / factor;
}

function toCsv(rows, columns) {
  const escape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    columns.map(escape).join(","),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
  ].join("\n");
}

function writeRows(rows, columns) {
  return toCsv(rows, columns);
}

function createDailyAndMarketOutputs() {
  const portfolio = readCsv(path.join(dataDirectory, "raw", "06_portfolio.csv"));
  const prices = readCsv(path.join(dataDirectory, "raw", "06_stock_prices.csv"));
  const indexRows = readCsv(path.join(dataDirectory, "market", "index.csv"));

  if (!portfolio || !prices || !indexRows) {
    return {};
  }

  const holdings = new Map();
  for (const row of portfolio) {
    const ticker = row.stock_id || row.ticker;
    const quantity = Number(row.quantity);
    if (!ticker || !Number.isFinite(quantity)) continue;
    holdings.set(ticker, (holdings.get(ticker) || 0) + quantity);
  }

  const dailyTotals = new Map();
  for (const row of prices) {
    const ticker = row.stock_id || row.ticker;
    const quantity = holdings.get(ticker);
    const closePrice = Number(row.price ?? row.close_price);
    if (!row.date && !row.trade_date) continue;
    if (quantity === undefined || !Number.isFinite(closePrice)) continue;
    const date = row.date || row.trade_date;
    dailyTotals.set(date, (dailyTotals.get(date) || 0) + quantity * closePrice);
  }

  const daily = [...dailyTotals.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([trade_date, total], index, rows) => {
      const previous = rows[index - 1]?.[1];
      return {
        trade_date,
        total_eval: round(total),
        diff_amt: previous === undefined ? null : round(total - previous),
        diff_pct: previous === undefined || previous === 0 ? null : round((total / previous - 1) * 100),
      };
    });

  const indexNames = [...new Set(indexRows.map((row) => row.index_name))].sort();
  const indexName = indexNames[0];
  const indexByDate = new Map(
    indexRows
      .filter((row) => row.index_name === indexName)
      .map((row) => [row.trade_date, Number(row.close_value)])
  );

  const comparison = daily
    .filter((row) => indexByDate.has(row.trade_date))
    .map((row, index, rows) => {
      const indexValue = indexByDate.get(row.trade_date);
      const previous = rows[index - 1];
      const previousIndexValue = previous ? indexByDate.get(previous.trade_date) : null;
      const indexPct =
        previousIndexValue && previousIndexValue !== 0
          ? round((indexValue / previousIndexValue - 1) * 100)
          : null;
      const portPct =
        previous && previous.total_eval !== 0
          ? round((row.total_eval / previous.total_eval - 1) * 100)
          : null;
      const first = rows[0];
      const firstIndexValue = indexByDate.get(first.trade_date);
      return {
        trade_date: row.trade_date,
        total_eval: row.total_eval,
        close_value: indexValue,
        port_pct: portPct,
        index_pct: indexPct,
        excess_pct: portPct === null || indexPct === null ? null : round(portPct - indexPct),
        rel_strength:
          first.total_eval === 0 || firstIndexValue === 0
            ? null
            : round((row.total_eval / first.total_eval) / (indexValue / firstIndexValue), 4),
      };
    });

  const shockDays = comparison
    .filter((row) => row.index_pct !== null)
    .sort((a, b) => Math.abs(b.index_pct) - Math.abs(a.index_pct))
    .slice(0, 5)
    .map((row) => ({
      trade_date: row.trade_date,
      index_pct: row.index_pct,
      port_pct: row.port_pct,
      direction: (row.index_pct > 0) === (row.port_pct > 0) ? "same" : "opposite",
    }));

  return {
    "pandas_D_daily_total.csv": writeRows(daily, [
      "trade_date",
      "total_eval",
      "diff_amt",
      "diff_pct",
    ]),
    "pandas_D_vs_index.csv": writeRows(comparison, [
      "trade_date",
      "total_eval",
      "close_value",
      "port_pct",
      "index_pct",
      "excess_pct",
      "rel_strength",
    ]),
    "pandas_D_index_shock_days.csv": writeRows(shockDays, [
      "trade_date",
      "index_pct",
      "port_pct",
      "direction",
    ]),
  };
}

const generatedOutputs = createDailyAndMarketOutputs();
const files = [
  "pandas_C_valuation.csv",
  "pandas_C_top_bottom.csv",
  "pandas_D_daily_total.csv",
  "pandas_D_vs_index.csv",
  "pandas_D_index_shock_days.csv",
  "pandas_E_index_summary.csv",
];

fs.mkdirSync(publicDirectory, { recursive: true });

for (const file of files) {
  const source = path.join(outputsDirectory, file);
  const destination = path.join(publicDirectory, file);

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destination);
    console.log(`Copied outputs/${file} to frontend/public/outputs/`);
  } else if (generatedOutputs[file]) {
    fs.writeFileSync(destination, generatedOutputs[file], "utf8");
    console.log(`Prepared frontend/public/outputs/${file} from existing data/*.csv`);
  } else if (fs.existsSync(destination)) {
    fs.unlinkSync(destination);
    console.warn(`Removed stale frontend/public/outputs/${file}`);
  } else {
    console.warn(`Missing outputs/${file}; source CSVs are unavailable for this section.`);
  }
}
