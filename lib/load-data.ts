import "server-only";
import type { DashboardData } from "./types";
import { getLatestVersion } from "./blob-store";
import seed from "../public/dashboard-data.json";

/**
 * Resolve the dataset to render: the most recent synced version from Blob,
 * or the bundled seed (the last CSV-built snapshot) if nothing's synced yet.
 */
export async function loadDashboard(): Promise<{
  data: DashboardData;
  lastSyncedAt: string | null;
}> {
  const latest = await getLatestVersion();
  if (latest) return { data: latest.data, lastSyncedAt: latest.syncedAt };
  return { data: seed as unknown as DashboardData, lastSyncedAt: null };
}
