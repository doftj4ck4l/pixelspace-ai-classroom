import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  OverviewArtifactType,
  OverviewDaily,
} from "@/components/kpm/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mac",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ogo",
  "Sep",
  "Okt",
  "Nov",
  "Dis",
];

const TYPE_LABELS: Record<string, string> = {
  flashcards: "Kad Imbas",
  quizzes: "Kuiz",
  mindmaps: "Peta Pembelajaran",
  slides: "Slaid",
  reports: "Laporan",
  infographics: "Infografik",
  podcasts: "Podcast",
  notes: "Nota",
  transformations: "Transformasi",
};

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

const dayLabel = (day: string) => {
  const [year, month, date] = day.split("-");
  return `${Number(date)} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
};

const dayTick = (value: unknown) => {
  const [, month, date] = String(value).split("-");
  return `${Number(date)} ${MONTHS[Number(month) - 1] ?? month}`;
};

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const ChartCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="border-border/60 bg-card rounded-2xl border p-4">
    <h3 className="text-sm font-medium">{title}</h3>
    <div className="text-muted-foreground/70 mt-3">{children}</div>
  </section>
);

const ChartEmpty = () => (
  <div className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">
    Tiada data untuk tempoh ini
  </div>
);

export const DailyActivityChart = ({ data }: { data: OverviewDaily[] }) => (
  <ChartCard title="Pengguna aktif harian">
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={MARGIN}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          opacity={0.12}
        />
        <XAxis
          dataKey="day"
          {...AXIS}
          minTickGap={28}
          tickFormatter={dayTick}
        />
        <YAxis {...AXIS} width={44} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP}
          labelFormatter={(label) => dayLabel(String(label))}
          cursor={{ opacity: 0.1 }}
        />
        <Line
          type="monotone"
          dataKey="activeUsers"
          name="Pengguna aktif"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </ChartCard>
);

export const ArtifactsByTypeChart = ({
  data,
}: {
  data: OverviewArtifactType[];
}) => (
  <ChartCard title="Artifak mengikut jenis">
    {data.length === 0 ? (
      <ChartEmpty />
    ) : (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={MARGIN}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            opacity={0.12}
          />
          <XAxis
            dataKey="type"
            {...AXIS}
            tickFormatter={(value) =>
              truncate(TYPE_LABELS[String(value)] ?? String(value), 12)
            }
          />
          <YAxis {...AXIS} width={44} allowDecimals={false} />
          <Tooltip
            contentStyle={TOOLTIP}
            labelFormatter={(label) => TYPE_LABELS[String(label)] ?? label}
            cursor={{ opacity: 0.1 }}
          />
          <Bar
            dataKey="count"
            name="Artifak"
            fill="#10b981"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    )}
  </ChartCard>
);

export const TopSchoolsChart = ({
  data,
}: {
  data: { name: string; chats: number }[];
}) => (
  <ChartCard title="Sekolah teratas mengikut sembang">
    {data.length === 0 ? (
      <ChartEmpty />
    ) : (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={MARGIN}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            opacity={0.12}
          />
          <XAxis type="number" {...AXIS} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            {...AXIS}
            width={150}
            tickFormatter={(value) => truncate(String(value), 22)}
          />
          <Tooltip contentStyle={TOOLTIP} cursor={{ opacity: 0.1 }} />
          <Bar
            dataKey="chats"
            name="Sembang"
            fill="#f59e0b"
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    )}
  </ChartCard>
);
