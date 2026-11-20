import { redirect } from "next/navigation";

/** Legacy route: registration now happens per role on the landing page. */
export default function RegisterPage() {
  redirect("/");
}
