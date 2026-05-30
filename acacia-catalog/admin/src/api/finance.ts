// admin/src/api/finance.ts
// Helpers CRUD para movimientos financieros.

import { apiRequest }    from '@/lib/apiClient';
import type { Transaction } from '@/types/finance';

export function listTransactions(): Promise<Transaction[]> {
  return apiRequest<Transaction[]>('/admin/transactions');
}

export function upsertTransaction(tx: Transaction): Promise<Transaction> {
  return apiRequest<Transaction>(`/admin/transactions/${tx.id}`, {
    method: 'PUT',
    body:   tx,
  });
}

export function deleteTransaction(id: string): Promise<void> {
  return apiRequest<void>(`/admin/transactions/${id}`, { method: 'DELETE' });
}
