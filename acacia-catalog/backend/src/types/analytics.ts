// backend/src/types/analytics.ts
// Tipos del módulo de analytics de visitas.
// Tabla: acacia-analytics
//   pk=PAGE#<slug>  sk=STATS     → contador de vistas por producto
//   pk=VISIT        sk=<iso>#<slug>#<ip>  → log de visitas con TTL 90 días

export interface PageStatsItem {
  pk:        string;   // PAGE#<slug>
  sk:        string;   // STATS
  slug:      string;
  viewCount: number;
  lastSeen:  string;   // ISO
}

export interface VisitLogItem {
  pk:        string;   // VISIT
  sk:        string;   // <isoTimestamp>#<slug>#<ip>
  slug:      string;
  ip:        string;
  userAgent?: string;
  expiresAt: number;   // unix timestamp (TTL 90 días)
}

/** Shape que devuelve GET /admin/analytics */
export interface AnalyticsSummary {
  topProducts: Array<{ slug: string; viewCount: number; lastSeen: string }>;
  recentVisits: Array<{ slug: string; ip: string; visitedAt: string }>;
}
