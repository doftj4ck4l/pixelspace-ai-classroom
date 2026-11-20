import { NextResponse } from "next/server";
import { getDevMailbox, isDevMailboxEnabled } from "@/lib/email";

/**
 * Development mailbox: when SMTP is not configured, verification and reset
 * emails land here so the flows stay testable on staging.
 */
export async function GET() {
  if (!isDevMailboxEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { enabled: true, emails: getDevMailbox() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
