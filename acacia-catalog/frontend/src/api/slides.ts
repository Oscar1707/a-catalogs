// frontend/src/api/slides.ts

import type { ApiResponse } from '@/types/product';
import type { SlidePublic } from '@/types/slide';

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchSlides(): Promise<SlidePublic[]> {
  const res = await fetch(`${API_URL}/slides`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);

  const body = (await res.json()) as ApiResponse<SlidePublic[]>;

  if (!body.ok) {
    throw new Error(`${body.error.code}: ${body.error.message}`);
  }

  return body.data;
}
