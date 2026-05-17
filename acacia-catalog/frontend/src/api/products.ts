import type { ApiResponse, ProductsByFamily } from '@/types/product';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn('[api] VITE_API_URL no está definido — usando fallback');
}

export async function fetchProducts(): Promise<ProductsByFamily> {
  const res = await fetch(`${API_URL}/products`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  }

  const body = (await res.json()) as ApiResponse<ProductsByFamily>;

  if (!body.ok) {
    throw new Error(`${body.error.code}: ${body.error.message}`);
  }

  return body.data;
}
