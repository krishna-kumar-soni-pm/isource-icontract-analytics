import { Dashboard } from "@/components/dashboard/dashboard";
import type { DashboardData } from "@/lib/types";
import raw from "../public/dashboard-data.json";

export default function Page() {
  const data = raw as unknown as DashboardData;
  return <Dashboard data={data} />;
}
