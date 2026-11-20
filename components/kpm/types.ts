export type RangeDays = 7 | 30 | 90;

export type OverviewTotals = {
  activeSchools: number;
  activeUsers: number;
  chats: number;
  artifacts: number;
  quizAttempts: number;
  avgQuizScore: number;
};

export type OverviewDaily = {
  day: string;
  activeUsers: number;
  chats: number;
  artifacts: number;
};

export type OverviewArtifactType = {
  type: string;
  count: number;
};

export type OverviewSchool = {
  id: string;
  name: string;
  state: string | null;
  district: string | null;
  students: number;
  teachers: number;
  activeUsers7d: number;
  chats: number;
  artifacts: number;
  quizAttempts: number;
  avgScore: number;
  masteryPct: number;
};

export type OverviewResponse = {
  totals: OverviewTotals;
  daily: OverviewDaily[];
  artifactsByType: OverviewArtifactType[];
  schools: OverviewSchool[];
  topSchools: { name: string; chats: number }[];
};

export type SchoolOption = {
  id: string;
  name: string;
  state: string | null;
  district: string | null;
};

export type SchoolsResponse = {
  schools: SchoolOption[];
};
