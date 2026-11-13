import { connection } from "next/server";

/** The server's clock, for the offset estimate in lib/clock/serverTime.ts. Never cached. */
export async function GET() {
  await connection();
  return Response.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
