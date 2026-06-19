import { Dashboard } from "@/components/dashboard/dashboard";
import { loadDashboard } from "@/lib/load-data";

// Always read the freshest synced dataset at request time.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { data, lastSyncedAt } = await loadDashboard();
  return <Dashboard data={data} lastSyncedAt={lastSyncedAt} />;
}
