// admin/src/api/costings.ts

import { apiRequest } from '@/lib/apiClient';
import type { Costing, CostingCreateInput } from '@/types/costing';

export async function listCostings(): Promise<Costing[]> {
  return apiRequest<Costing[]>('/admin/costings');
}

export async function getCosting(id: string): Promise<Costing> {
  return apiRequest<Costing>(`/admin/costings/${encodeURIComponent(id)}`);
}

export async function createCosting(input: CostingCreateInput): Promise<Costing> {
  return apiRequest<Costing>('/admin/costings', { method: 'POST', body: input });
}

export async function updateCosting(id: string, input: CostingCreateInput): Promise<Costing> {
  return apiRequest<Costing>(
    `/admin/costings/${encodeURIComponent(id)}`,
    { method: 'PUT', body: input },
  );
}

export async function deleteCosting(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiRequest<{ id: string; deleted: boolean }>(
    `/admin/costings/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}
