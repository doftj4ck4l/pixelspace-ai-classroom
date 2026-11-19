import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** The signed-in user, or null — for server components and route handlers. */
export const getSessionUser = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
};

/** For API routes: the user, or a 401 Response to return directly. */
export const requireApiUser = async () => {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, response: new Response("Unauthorized", { status: 401 }) } as const;
  }
  return { user, response: null } as const;
};
