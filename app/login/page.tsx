import { redirect } from "next/navigation";

/** Legacy route: sign-in now happens per role on the landing page. */
export default function LoginPage() {
  redirect("/");
}
