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

/** Post-login landing for every role: the chat (role pages stay in the sidebar). */
export const roleHome = (_role: unknown): string => "/chat";
