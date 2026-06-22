import { buildAgent } from "./agent-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT = "NX-2177715f";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const code = buildAgent({
    ingestUrl: `${origin}/api/ingest`,
    statusUrl: `${origin}/api/sync-status`,
    secret: process.env.INGEST_SECRET ?? "",
    account: ACCOUNT,
  });
  return new Response(code, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
