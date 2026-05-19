// admin/src/api/quotes.ts
// Cliente HTTP para operaciones de cotizaciones (admin).
// Todas las funciones requieren auth — el helper apiRequest envía el token.

import { apiRequest } from '@/lib/apiClient';
import type {
  NotePublic,
  QuoteAdminDetail,
  QuoteAdminSummary,
  QuoteStatus,
} from '@/types/quote';

// GET /admin/quotes?status=<opcional>
export async function listQuotes(
  status?: QuoteStatus,
): Promise<QuoteAdminSummary[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<QuoteAdminSummary[]>(`/admin/quotes${qs}`);
}

// GET /admin/quotes/{reference}
export async function getQuote(reference: string): Promise<QuoteAdminDetail> {
  return apiRequest<QuoteAdminDetail>(
    `/admin/quotes/${encodeURIComponent(reference)}`,
  );
}

// PATCH /admin/quotes/{reference}/status
export async function updateQuoteStatus(
  reference: string,
  status: QuoteStatus,
): Promise<{ reference: string; status: QuoteStatus; updatedAt: string }> {
  return apiRequest(
    `/admin/quotes/${encodeURIComponent(reference)}/status`,
    { method: 'PATCH', body: { status } },
  );
}

// POST /admin/quotes/{reference}/notes
export async function addQuoteNote(
  reference: string,
  text: string,
): Promise<NotePublic> {
  return apiRequest<NotePublic>(
    `/admin/quotes/${encodeURIComponent(reference)}/notes`,
    { method: 'POST', body: { text } },
  );
}
