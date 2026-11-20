import type { OverviewSchool } from "@/components/kpm/types";

const nf = new Intl.NumberFormat("ms-MY");

export const KpmSchoolsTable = ({ schools }: { schools: OverviewSchool[] }) => (
  <div className="border-border/60 bg-card overflow-hidden rounded-2xl border">
    <div className="scrollbar-subtle overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="text-muted-foreground border-border/60 border-b text-left text-xs">
            <th className="px-4 py-2.5 font-medium">Sekolah</th>
            <th className="px-3 py-2.5 text-right font-medium">Pelajar</th>
            <th className="px-3 py-2.5 text-right font-medium">Guru</th>
            <th className="px-3 py-2.5 text-right font-medium">Aktif (7h)</th>
            <th className="px-3 py-2.5 text-right font-medium">Sembang</th>
            <th className="px-3 py-2.5 text-right font-medium">Artifak</th>
            <th className="px-3 py-2.5 text-right font-medium">Kuiz</th>
            <th className="px-3 py-2.5 text-right font-medium">Skor</th>
            <th className="px-4 py-2.5 font-medium">Penguasaan</th>
          </tr>
        </thead>
        <tbody>
          {schools.map((school) => (
            <tr
              key={school.id}
              className="border-border/60 border-b last:border-0"
            >
              <td className="px-4 py-3">
                <p className="font-medium">{school.name}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {[school.district, school.state]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {nf.format(school.students)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {nf.format(school.teachers)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {nf.format(school.activeUsers7d)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {nf.format(school.chats)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {nf.format(school.artifacts)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {nf.format(school.quizAttempts)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {school.avgScore}%
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="bg-muted/70 h-1.5 w-24 shrink-0 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(school.masteryPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                    {school.masteryPct}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
