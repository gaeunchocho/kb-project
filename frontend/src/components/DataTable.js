function formatCell(value, format) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (format === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("ko-KR") : String(value);
  }
  if (format === "percent") {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
  }
  if (format === "date") {
    return String(value).slice(0, 10);
  }
  return String(value);
}

export default function DataTable({ columns, rows, rowKey }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey ? rowKey(row, index) : index}>
              {columns.map((col) => (
                <td key={col.key} className={col.format === "percent" ? "num" : undefined}>
                  {formatCell(row[col.key], col.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
