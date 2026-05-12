// backend/src/types/slide.ts
// Slides del carrusel del home. Viven en la tabla acacia-products
// con prefijo PK: SLIDE#<id> (cero costo extra de tabla nueva).
// Mantener sincronizado con frontend/src/types/slide.ts (mirror).

// ── Tipos de slide (define el comportamiento del CTA) ─────────────────────────

export const SLIDE_TYPES = ['product', 'service', 'promo'] as const;
export type SlideType = typeof SLIDE_TYPES[number];

// ── Item DynamoDB ─────────────────────────────────────────────────────────────

export interface SlideItem {
  // Keys internas — nunca exponer
  PK: string; // "SLIDE#01"
  SK: string; // "METADATA"

  // Identificación
  id:   string; // "01"
  type: SlideType;

  // Contenido visual
  title:    string; // headline principal
  subtitle: string; // tagline secundario
  image:    string; // URL S3 (acacia-catalog-images/slides/...)

  // CTA — comportamiento depende de `type`
  //   product → link interno `/catalogo?familia=<value>` o `/catalogo`
  //   service → link interno `/cotizaciones?tipo=<value>`
  //   promo   → URL externa (Instagram, WhatsApp, etc.)
  ctaLabel:  string; // texto del botón
  ctaTarget: string; // URL completa o path interno

  // Control
  active: boolean;
  order:  number; // orden de aparición (reservado en DynamoDB)
}

// ── Shape público (sin claves internas) ───────────────────────────────────────

export type SlidePublic = Omit<SlideItem, 'PK' | 'SK'>;
