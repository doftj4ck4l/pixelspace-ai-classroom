import { redirect } from "next/navigation";

/** Legacy per-role URLs: there is one login page now. */
export default function LoginRolePage() {
  redirect("/login");
}
