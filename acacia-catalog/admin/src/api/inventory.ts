// admin/src/api/inventory.ts
// Helpers CRUD para inventario de materiales.

import { apiRequest }           from '@/lib/apiClient';
import type { InventoryItem, InventoryMovement, MovementType } from '@/types/inventory';

export function listInventory(): Promise<InventoryItem[]> {
  return apiRequest<InventoryItem[]>('/admin/inventory');
}

export function upsertInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(`/admin/inventory/${item.id}`, {
    method: 'PUT',
    body:   item,
  });
}

export function deleteInventoryItem(id: string): Promise<void> {
  return apiRequest<void>(`/admin/inventory/${id}`, { method: 'DELETE' });
}

export function addMovement(
  itemId:   string,
  type:     MovementType,
  quantity: number,
  note?:    string,
  date?:    string,
): Promise<{ newQuantity: number; movement: InventoryMovement }> {
  return apiRequest(`/admin/inventory/${itemId}/movement`, {
    method: 'POST',
    body:   { type, quantity, note, date },
  });
}

export function listMovements(itemId: string): Promise<InventoryMovement[]> {
  return apiRequest<InventoryMovement[]>(`/admin/inventory/${itemId}/movements`);
}
