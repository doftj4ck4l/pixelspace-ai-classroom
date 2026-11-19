"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * A model-authored chart, mirroring pixelspacev3's renderer.
 *
 * The spec is validated by the harness before it reaches us, so this only has
 * to turn declarative props into a recharts tree. Colours are a fixed
 * categorical palette (recharts needs concrete fills); axes and grid follow the
 * theme through `currentColor` at low opacity.
 */

export type ChartProps = {
  type: "bar" | "line" | "area" | "pie" | "scatter";
  data: Record<string, unknown>[];
  x: string;
  y: string | string[];
  title?: string;
  color?: string;
  colors?: string[];
};

const PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
];

const AXIS = {
  stroke: "currentColor",
  tick: { fill: "currentColor", fontSize: 12 },
  opacity: 0.55,
};

const MARGIN = { top: 8, right: 16, bottom: 4, left: 8 };

const TOOLTIP = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const formatTick = (v: unknown) =>
  typeof v === "number" ? compact.format(v) : String(v ?? "");

export function Chart({ type, data, x, y, title, color, colors }: ChartProps) {
  const series = Array.isArray(y) ? y : [y];
  const chosen = colors?.length ? colors : color ? [color] : PALETTE;
  const palette = (i: number) => chosen[i % chosen.length];

  return (
    <figure className="border-border/60 bg-card text-card-foreground my-4 rounded-lg border p-3">
      {title ? (
        <figcaption className="text-foreground mb-2 px-1 text-sm font-medium">
          {title}
        </figcaption>
      ) : null}
      <div className="text-muted-foreground/70">
        <ResponsiveContainer width="100%" height={260}>
          {renderChart(type, data, x, series, palette)}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function renderChart(
  type: ChartProps["type"],
  data: ChartProps["data"],
  x: string,
  series: string[],
  color: (i: number) => string,
) {
  const grid = (
    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
  );
  const xa = <XAxis dataKey={x} {...AXIS} />;
  const ya = <YAxis {...AXIS} width={52} tickFormatter={formatTick} />;
  const tip = <Tooltip contentStyle={TOOLTIP} cursor={{ opacity: 0.1 }} />;
  const legend =
    series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null;

  switch (type) {
    case "bar":
      return (
        <BarChart data={data} margin={MARGIN}>
          {grid}
          {xa}
          {ya}
          {tip}
          {legend}
          {series.map((k, i) => (
            <Bar key={k} dataKey={k} fill={color(i)} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      );
    case "line":
      return (
        <LineChart data={data} margin={MARGIN}>
          {grid}
          {xa}
          {ya}
          {tip}
          {legend}
          {series.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={color(i)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      );
    case "area":
      return (
        <AreaChart data={data} margin={MARGIN}>
          {grid}
          {xa}
          {ya}
          {tip}
          {legend}
          {series.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={color(i)}
              fill={color(i)}
              fillOpacity={0.18}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      );
    case "scatter":
      return (
        <ScatterChart margin={MARGIN}>
          {grid}
          <XAxis dataKey={x} {...AXIS} />
          {ya}
          {tip}
          {legend}
          {series.map((k, i) => (
            <Scatter key={k} name={k} data={data} dataKey={k} fill={color(i)} />
          ))}
        </ScatterChart>
      );
    case "pie":
      return (
        <PieChart margin={MARGIN}>
          {tip}
          <Pie data={data} dataKey={series[0]} nameKey={x} outerRadius={100}>
            {data.map((_, i) => (
              <Cell key={i} fill={color(i)} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      );
    default:
      return null;
  }
}
