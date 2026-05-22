// frontend/src/api/analytics.ts
// Fire-and-forget: registra la visita de un producto.

const API_URL = import.meta.env.VITE_API_URL as string;

export function trackPageView(slug: string): void {
  // Fire and forget — no esperamos respuesta ni manejamos errores
  fetch(`${API_URL}/analytics/pageview`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ slug }),
  }).catch(() => { /* silencioso */ });
}
