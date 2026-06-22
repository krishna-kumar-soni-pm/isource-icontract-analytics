import { readStatus, writeStatus, getSyncMeta, type SyncStatus } from "@/lib/blob-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cors(origin: string | null): Record<string, string> {
  const allow = origin && /(^https:\/\/[a-z0-9-]+\.)?userpilot\.io$/.test(origin)
    ? origin
    : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

export async function GET(req: Request) {
  const [status, meta] = await Promise.all([readStatus(), getSyncMeta()]);
  return new Response(JSON.stringify({ status, lastSyncedAt: meta.lastSyncedAt }), {
    status: 200,
    headers: { ...cors(req.headers.get("origin")), "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const headers = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  let body: Partial<SyncStatus> & { secret?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers });
  }
  const expected = process.env.INGEST_SECRET;
  if (expected && body.secret !== expected) {
    return new Response(JSON.stringify({ ok: false }), { status: 401, headers });
  }
  await writeStatus({
    phase: body.phase ?? "pulling",
    done: body.done ?? 0,
    total: body.total ?? 0,
    label: body.label ?? "",
    at: new Date().toISOString(),
  });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
