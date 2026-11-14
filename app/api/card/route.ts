import { z } from "zod";
import { WorldSchema } from "@/lib/engine/types";
import { getProvider } from "@/lib/llm";
import { getBundle } from "@/lib/server/bundle";
import { cardFor } from "@/lib/server/cards";

const Body = z.object({ match_id: z.string(), moment_id: z.string().max(40), world: WorldSchema });

function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

/** POST /api/card: one checked card for a moment and a world (docs/TRD.md section 5). */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return error("bad_request", "The body is not JSON.", 400);
  }
  const body = Body.safeParse(json);
  if (!body.success) return error("bad_request", "Expected match_id, moment_id and world.", 400);

  const bundle = await getBundle();
  if (body.data.match_id !== bundle.match.id) return error("bad_request", "Unknown match.", 400);
  const card = await cardFor(bundle, body.data.moment_id, body.data.world, getProvider());
  if (!card) return error("bad_request", "Unknown moment.", 400);
  const { moment_id, world, kind, headline, what, why, watch, source, checked } = card;
  return Response.json({ moment_id, world, kind, headline, what, why, watch, source, checked });
}
