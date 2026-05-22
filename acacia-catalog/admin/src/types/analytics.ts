// admin/src/types/analytics.ts
export interface AnalyticsSummary {
  topProducts: Array<{ slug: string; viewCount: number; lastSeen: string }>;
  recentVisits: Array<{ slug: string; ip: string; visitedAt: string }>;
}
