// frontend/src/api/quotes.ts
// Cliente de la API de cotizaciones.
// Envelope estándar: { ok, data, meta } | { ok: false, error }.

import type { ApiResponse } from '@/types/product';
import type {
  QuoteCreateInput,
  QuoteCreateResult,
  QuoteStatusResult,
} from '@/types/quote';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn('[api] VITE_API_URL no está definido');
}

// ── POST /quotes ──────────────────────────────────────────────────────────────
export async function createQuote(
  input: QuoteCreateInput,
): Promise<QuoteCreateResult> {
  const res = await fetch(`${API_URL}/quotes`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: JSON.stringify(input),
  });

  const body = (await res.json()) as ApiResponse<QuoteCreateResult>;

  if (!res.ok || !body.ok) {
    const msg = !body.ok
      ? `${body.error.code}: ${body.error.message}`
      : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body.data;
}

// ── GET /quotes/{reference}?phone=... ────────────────────────────────────────
export async function fetchQuoteStatus(
  reference: string,
  phone:     string,
): Promise<QuoteStatusResult> {
  const url = `${API_URL}/quotes/${encodeURIComponent(reference)}?phone=${encodeURIComponent(phone)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });

  const body = (await res.json()) as ApiResponse<QuoteStatusResult>;

  if (!res.ok || !body.ok) {
    const msg = !body.ok
      ? `${body.error.code}: ${body.error.message}`
      : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body.data;
}
