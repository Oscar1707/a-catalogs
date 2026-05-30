// admin/src/api/boards.ts
// Helpers para CRUD de tableros de corte en DynamoDB vía API admin.

import { apiRequest } from '@/lib/apiClient';
import type { SavedBoard } from '@/types/corte';

export function listBoards(): Promise<SavedBoard[]> {
  return apiRequest<SavedBoard[]>('/admin/boards');
}

export function upsertBoard(board: SavedBoard): Promise<SavedBoard> {
  return apiRequest<SavedBoard>(`/admin/boards/${board.id}`, {
    method: 'PUT',
    body:   board,
  });
}

export function deleteBoard(id: string): Promise<void> {
  return apiRequest<void>(`/admin/boards/${id}`, { method: 'DELETE' });
}
