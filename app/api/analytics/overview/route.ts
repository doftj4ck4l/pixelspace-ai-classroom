import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireRoleApi } from "@/lib/roles";

const RANGES = new Set([7, 30, 90]);
const NO_STORE = { "Cache-Control": "no-store" };

type DailyActivityRow = { day: string; active_users: number };
type DailyContentRow = { day: string; chats: number; artifacts: number };
type ActivityTotalsRow = { active_users: number; active_schools: number };
type QuizTotalsRow = { attempts: number; answered: number; correct: number };
type ArtifactTypeRow = { type: string; count: number };
type SchoolRow = {
  id: string;
  name: string;
  state: string | null;
  district: string | null;
};
type RosterRow = { school_id: string; students: number; teachers: number };
type Active7dRow = { school_id: string; active_users: number };
type SchoolContentRow = {
  school_id: string;
  chats: number;
  artifacts: number;
};
type SchoolQuizRow = {
  school_id: string;
  attempts: number;
  answered: number;
  correct: number;
};
type SchoolMasteryRow = { school_id: string; known: number; total: number };

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

export async function GET(req: Request) {
  const { user, response } = await requireRoleApi("kpm", "superadmin");
  if (!user) return response;

  const params = new URL(req.url).searchParams;
  const daysParam = Number(params.get("days"));
  const days = RANGES.has(daysParam) ? daysParam : 30;
  const schoolId = params.get("schoolId")?.trim() || null;

  const rangeStart = sql`date_trunc('day', now()) - (${days - 1}::int) * interval '1 day'`;
  const weekStart = sql`date_trunc('day', now()) - interval '6 days'`;
  const roles = sql`u.role not in ('kpm', 'superadmin')`;
  const school = schoolId ? sql` and u.school_id = ${schoolId}` : sql``;

  const [
    dailyActivity,
    dailyContent,
    activityTotals,
    quizTotals,
    artifactTypes,
    schoolList,
    roster,
    active7d,
    schoolContent,
    schoolQuiz,
    schoolMastery,
  ] = await Promise.all([
    db.execute<DailyActivityRow>(sql`
      with days as (
        select generate_series(
          date_trunc('day', now()) - (${days - 1}::int) * interval '1 day',
          date_trunc('day', now()),
          interval '1 day'
        ) as day
      ),
      activity as (
        select s.user_id, s.created_at as at
        from session s
        join "user" u on u.id = s.user_id
        where s.created_at >= ${rangeStart} and ${roles}${school}
        union all
        select e.user_id, e.created_at as at
        from auth_events e
        join "user" u on u.id = e.user_id
        where e.event = 'login'
          and e.created_at >= ${rangeStart} and ${roles}${school}
      )
      select to_char(d.day, 'YYYY-MM-DD') as day,
             count(distinct a.user_id)::int as active_users
      from days d
      left join activity a
        on a.at >= d.day and a.at < d.day + interval '1 day'
      group by d.day
      order by d.day
    `),
    db.execute<DailyContentRow>(sql`
      with days as (
        select generate_series(
          date_trunc('day', now()) - (${days - 1}::int) * interval '1 day',
          date_trunc('day', now()),
          interval '1 day'
        ) as day
      ),
      chats as (
        select date_trunc('day', t.created_at) as day, count(*)::int as n
        from threads t
        join "user" u on u.id = t.user_id
        where t.created_at >= ${rangeStart} and ${roles}${school}
        group by 1
      ),
      arts as (
        select date_trunc('day', a.created_at) as day, count(*)::int as n
        from artifacts a
        join "user" u on u.id = a.user_id
        where a.created_at >= ${rangeStart} and ${roles}${school}
        group by 1
      )
      select to_char(d.day, 'YYYY-MM-DD') as day,
             coalesce(c.n, 0)::int as chats,
             coalesce(a.n, 0)::int as artifacts
      from days d
      left join chats c on c.day = d.day
      left join arts a on a.day = d.day
      order by d.day
    `),
    db.execute<ActivityTotalsRow>(sql`
      with activity as (
        select s.user_id, u.school_id
        from session s
        join "user" u on u.id = s.user_id
        where s.created_at >= ${rangeStart} and ${roles}${school}
        union all
        select e.user_id, u.school_id
        from auth_events e
        join "user" u on u.id = e.user_id
        where e.event = 'login'
          and e.created_at >= ${rangeStart} and ${roles}${school}
      )
      select count(distinct user_id)::int as active_users,
             count(distinct school_id)::int as active_schools
      from activity
    `),
    db.execute<QuizTotalsRow>(sql`
      select count(distinct (q.user_id, q.quiz_id))::int as attempts,
             count(e.key)::int as answered,
             count(*) filter (where e.value = 'correct')::int as correct
      from (
        select qp.user_id, qp.quiz_id, qp.results
        from quiz_progress qp
        join "user" u on u.id = qp.user_id
        where qp.updated_at >= ${rangeStart}
          and qp.results <> '{}'::jsonb
          and jsonb_typeof(qp.results) = 'object'
          and ${roles}${school}
      ) q
      left join lateral jsonb_each_text(q.results) e on true
    `),
    db.execute<ArtifactTypeRow>(sql`
      select a.type, count(*)::int as count
      from artifacts a
      join "user" u on u.id = a.user_id
      where a.created_at >= ${rangeStart} and ${roles}${school}
      group by a.type
      order by 2 desc, a.type asc
    `),
    db.execute<SchoolRow>(sql`
      select s.id, s.name, s.state, s.district
      from schools s
      where s.is_active = true
        ${schoolId ? sql`and s.id = ${schoolId}` : sql``}
      order by s.name asc
    `),
    db.execute<RosterRow>(sql`
      select u.school_id,
             count(*) filter (where u.role = 'student')::int as students,
             count(*) filter (where u.role = 'teacher')::int as teachers
      from "user" u
      where u.school_id is not null and ${roles}${school}
      group by u.school_id
    `),
    db.execute<Active7dRow>(sql`
      with activity as (
        select s.user_id, u.school_id
        from session s
        join "user" u on u.id = s.user_id
        where s.created_at >= ${weekStart}
          and u.school_id is not null and ${roles}${school}
        union all
        select e.user_id, u.school_id
        from auth_events e
        join "user" u on u.id = e.user_id
        where e.event = 'login'
          and e.created_at >= ${weekStart}
          and u.school_id is not null and ${roles}${school}
      )
      select school_id, count(distinct user_id)::int as active_users
      from activity
      group by school_id
    `),
    db.execute<SchoolContentRow>(sql`
      select school_id, sum(chats)::int as chats, sum(artifacts)::int as artifacts
      from (
        select u.school_id, 1 as chats, 0 as artifacts
        from threads t
        join "user" u on u.id = t.user_id
        where t.created_at >= ${rangeStart}
          and u.school_id is not null and ${roles}${school}
        union all
        select u.school_id, 0, 1
        from artifacts a
        join "user" u on u.id = a.user_id
        where a.created_at >= ${rangeStart}
          and u.school_id is not null and ${roles}${school}
      ) combined
      group by school_id
    `),
    db.execute<SchoolQuizRow>(sql`
      select q.school_id,
             count(distinct (q.user_id, q.quiz_id))::int as attempts,
             count(e.key)::int as answered,
             count(*) filter (where e.value = 'correct')::int as correct
      from (
        select u.school_id, qp.user_id, qp.quiz_id, qp.results
        from quiz_progress qp
        join "user" u on u.id = qp.user_id
        where qp.updated_at >= ${rangeStart}
          and qp.results <> '{}'::jsonb
          and jsonb_typeof(qp.results) = 'object'
          and u.school_id is not null and ${roles}${school}
      ) q
      left join lateral jsonb_each_text(q.results) e on true
      group by q.school_id
    `),
    db.execute<SchoolMasteryRow>(sql`
      select u.school_id,
             coalesce(sum(jsonb_array_length(dp.known_indices)), 0)::int as known,
             coalesce(sum(dp.total::int), 0)::int as total
      from deck_progress dp
      join "user" u on u.id = dp.user_id
      where dp.updated_at >= ${rangeStart}
        and jsonb_typeof(dp.known_indices) = 'array'
        and u.school_id is not null and ${roles}${school}
      group by u.school_id
    `),
  ]);

  const contentByDay = new Map(dailyContent.rows.map((row) => [row.day, row]));
  const daily = dailyActivity.rows.map((row) => ({
    day: row.day,
    activeUsers: row.active_users,
    chats: contentByDay.get(row.day)?.chats ?? 0,
    artifacts: contentByDay.get(row.day)?.artifacts ?? 0,
  }));

  const totalsRow = activityTotals.rows[0];
  const quizRow = quizTotals.rows[0];
  const totals = {
    activeSchools: totalsRow?.active_schools ?? 0,
    activeUsers: totalsRow?.active_users ?? 0,
    chats: daily.reduce((sum, row) => sum + row.chats, 0),
    artifacts: daily.reduce((sum, row) => sum + row.artifacts, 0),
    quizAttempts: quizRow?.attempts ?? 0,
    avgQuizScore: pct(quizRow?.correct ?? 0, quizRow?.answered ?? 0),
  };

  const rosterBySchool = new Map(
    roster.rows.map((row) => [row.school_id, row]),
  );
  const active7dBySchool = new Map(
    active7d.rows.map((row) => [row.school_id, row.active_users]),
  );
  const contentBySchool = new Map(
    schoolContent.rows.map((row) => [row.school_id, row]),
  );
  const quizBySchool = new Map(
    schoolQuiz.rows.map((row) => [row.school_id, row]),
  );
  const masteryBySchool = new Map(
    schoolMastery.rows.map((row) => [row.school_id, row]),
  );

  const schools = schoolList.rows
    .map((schoolRow) => {
      const quiz = quizBySchool.get(schoolRow.id);
      const mastery = masteryBySchool.get(schoolRow.id);
      return {
        id: schoolRow.id,
        name: schoolRow.name,
        state: schoolRow.state,
        district: schoolRow.district,
        students: rosterBySchool.get(schoolRow.id)?.students ?? 0,
        teachers: rosterBySchool.get(schoolRow.id)?.teachers ?? 0,
        activeUsers7d: active7dBySchool.get(schoolRow.id) ?? 0,
        chats: contentBySchool.get(schoolRow.id)?.chats ?? 0,
        artifacts: contentBySchool.get(schoolRow.id)?.artifacts ?? 0,
        quizAttempts: quiz?.attempts ?? 0,
        avgScore: pct(quiz?.correct ?? 0, quiz?.answered ?? 0),
        masteryPct: pct(mastery?.known ?? 0, mastery?.total ?? 0),
      };
    })
    .sort((a, b) => b.chats - a.chats || a.name.localeCompare(b.name));

  const topSchools = schools
    .filter((schoolRow) => schoolRow.chats > 0)
    .slice(0, 5)
    .map((schoolRow) => ({
      name: schoolRow.name,
      chats: schoolRow.chats,
    }));

  return NextResponse.json(
    {
      totals,
      daily,
      artifactsByType: artifactTypes.rows.map((row) => ({
        type: row.type,
        count: row.count,
      })),
      schools,
      topSchools,
    },
    { headers: NO_STORE },
  );
}
