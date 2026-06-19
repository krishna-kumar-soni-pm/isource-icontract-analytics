import { put, list, del } from "@vercel/blob";
import type { DashboardData } from "./types";

const PREFIX = "versions/";
const KEEP = 3;

export interface VersionPayload {
  syncedAt: string; // ISO
  data: DashboardData;
}

export interface SyncMeta {
  lastSyncedAt: string | null;
  versionCount: number;
  versions: { syncedAt: string; pathname: string }[];
}

function tokenAvailable(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Persist a new dataset version, then prune to the most recent KEEP versions. */
export async function saveVersion(data: DashboardData): Promise<VersionPayload> {
  const syncedAt = new Date().toISOString();
  const payload: VersionPayload = { syncedAt, data };
  const key = `${PREFIX}${Date.now()}.json`;
  await put(key, JSON.stringify(payload), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });

  // prune older versions beyond KEEP
  const { blobs } = await list({ prefix: PREFIX });
  const sorted = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
  const stale = sorted.slice(KEEP);
  if (stale.length) await del(stale.map((b) => b.url));

  return payload;
}

/** Read the most recent dataset version, or null if none synced yet. */
export async function getLatestVersion(): Promise<VersionPayload | null> {
  if (!tokenAvailable()) return null;
  try {
    const { blobs } = await list({ prefix: PREFIX });
    if (!blobs.length) return null;
    const newest = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname))[0];
    const res = await fetch(newest.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as VersionPayload;
  } catch {
    return null;
  }
}

/** Lightweight metadata for the UI (last synced + retained versions). */
export async function getSyncMeta(): Promise<SyncMeta> {
  if (!tokenAvailable()) return { lastSyncedAt: null, versionCount: 0, versions: [] };
  try {
    const { blobs } = await list({ prefix: PREFIX });
    const sorted = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
    const versions = sorted.map((b) => ({
      syncedAt: new Date(b.uploadedAt).toISOString(),
      pathname: b.pathname,
    }));
    return {
      lastSyncedAt: versions[0]?.syncedAt ?? null,
      versionCount: versions.length,
      versions,
    };
  } catch {
    return { lastSyncedAt: null, versionCount: 0, versions: [] };
  }
}
