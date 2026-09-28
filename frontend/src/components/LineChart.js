import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatXAxis(value) {
  return String(value).slice(0, 10);
}

export default function LineChart({ data, xKey, series }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={320}>
        <RechartsLineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3544" />
          <XAxis dataKey={xKey} tickFormatter={formatXAxis} stroke="#8b9bb4" minTickGap={24} />
          <YAxis stroke="#8b9bb4" />
          <Tooltip
            labelFormatter={formatXAxis}
            contentStyle={{ background: "#151b24", border: "1px solid #2a3544", color: "#e8eef6" }}
          />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
