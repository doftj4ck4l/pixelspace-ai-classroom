export type AuthRole = "student" | "teacher" | "kpm" | "superadmin";

const AUTH_ROLES: readonly AuthRole[] = [
  "student",
  "teacher",
  "kpm",
  "superadmin",
];

export const roleOfUser = (user: unknown): AuthRole => {
  const role = (user as { role?: unknown } | null | undefined)?.role;
  return typeof role === "string" &&
    (AUTH_ROLES as readonly string[]).includes(role)
    ? (role as AuthRole)
    : "student";
};

export const roleHome = (role: unknown): string => {
  const value = roleOfUser({ role });
  if (value === "student") return "/student";
  if (value === "kpm") return "/kpm";
  if (value === "superadmin") return "/admin";
  return "/chat";
};
