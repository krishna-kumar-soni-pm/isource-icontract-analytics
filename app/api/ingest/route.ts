import { buildDataset, type RawRow } from "@/lib/aggregate";
import { saveVersion } from "@/lib/blob-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && /(^https:\/\/[a-z0-9-]+\.)?userpilot\.io$/.test(origin)
    ? origin
    : "https://run.userpilot.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  let body: { secret?: string; rows?: RawRow[] };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid JSON body" }, 400);
  }

  const expected = process.env.INGEST_SECRET;
  if (expected && body.secret !== expected) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return json({ ok: false, error: "no rows supplied" }, 400);
  }

  try {
    const data = buildDataset(body.rows);
    const saved = await saveVersion(data);
    return json({
      ok: true,
      syncedAt: saved.syncedAt,
      totals: data.summary.totals,
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
