export type Product = "iSource" | "iContract";
export type Kind = "Event" | "Page";
export type Recency =
  | "Last 7 days"
  | "Last 30 days"
  | "Last 90 days"
  | "Older than 90 days"
  | "Never";

/** One company × feature observation — the atomic unit of the dataset. */
export interface Datum {
  company: string;
  product: Product;
  kind: Kind;
  name: string;
  category: string;
  description: string;
  users: number;
  occurrences: number;
  avgPerUser: number;
  lastActivity: string | null;
  insertedAt: string | null;
  owner: string;
  daysSince: number | null;
  recency: Recency;
  adopted: boolean;
}

export interface ProductStats {
  occurrences: number;
  users: number;
  featuresAvailable: number;
  featuresAdopted: number;
  adoptionRate: number;
}

export interface Company {
  name: string;
  products: Product[];
  isProspectBoth: boolean;
  totalOccurrences: number;
  activeUsers: number;
  featuresAvailable: number;
  featuresAdopted: number;
  adoptionRate: number;
  lastActivity: string | null;
  daysSinceActive: number | null;
  recency: Recency;
  iSource: ProductStats | null;
  iContract: ProductStats | null;
}

export interface Feature {
  product: Product;
  kind: Kind;
  name: string;
  category: string;
  description: string;
  owner: string;
  totalOccurrences: number;
  totalUsers: number;
  companiesAvailable: number;
  companiesAdopted: number;
  adoptionRate: number;
  avgPerUser: number;
  lastActivity: string | null;
  insertedAt: string | null;
  topCompanies: { company: string; occurrences: number; users: number }[];
}

export interface Summary {
  generatedFor: string;
  dataThrough: string;
  totals: {
    companies: number;
    products: number;
    totalOccurrences: number;
    totalEventOccurrences: number;
    totalPageViews: number;
    uniqueFeatures: number;
    trackedRows: number;
    companiesBothProducts: number;
    activeLast30d: number;
  };
  byProduct: {
    product: Product;
    companies: number;
    activeCompanies: number;
    occurrences: number;
    uniqueFeatures: number;
    activeUsers: number;
  }[];
  recencyCohort: Record<string, number>;
  rolloutTimeline: Record<string, number>;
  categoryByOccurrences: Record<string, number>;
  adoptionHistogram: Record<string, number>;
}

export interface DashboardData {
  summary: Summary;
  companies: Company[];
  features: Feature[];
  records: Datum[];
}
