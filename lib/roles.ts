import { requireApiUser } from "@/lib/auth-session";

/** The four account roles. Admin (KPM + superadmin) share the formal design. */
export const ROLES = ["student", "teacher", "kpm", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

export const roleOf = (user: unknown): Role => {
  const role = (user as { role?: unknown } | null | undefined)?.role;
  return isRole(role) ? role : "student";
};

/** Where each role lands after login / on `/`. */
export const getRoleHome = (role: Role): string =>
  role === "student"
    ? "/student"
    : role === "kpm"
      ? "/kpm"
      : role === "superadmin"
        ? "/admin"
        : "/chat";

/** For API routes: the user with one of the allowed roles, or a Response. */
export const requireRoleApi = async (...roles: Role[]) => {
  const { user, response } = await requireApiUser();
  if (!user) return { user: null, response } as const;
  if (!roles.includes(roleOf(user))) {
    return {
      user: null,
      response: new Response("Forbidden", { status: 403 }),
    } as const;
  }
  return { user, response: null } as const;
};
