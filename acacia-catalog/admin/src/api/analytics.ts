// admin/src/api/analytics.ts
import { apiRequest } from '@/lib/apiClient';
import type { AnalyticsSummary } from '@/types/analytics';

export function getAnalytics(): Promise<AnalyticsSummary> {
  return apiRequest<AnalyticsSummary>('/admin/analytics');
}
