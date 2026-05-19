// backend/src/types/quote.ts
// Tipos del dominio de Cotizaciones.
// Mantener sincronizado con frontend/src/types/quote.ts (mirror).

// ── Enums del dominio (valores fijos por contrato) ────────────────────────────

export const QUOTE_STATUSES = [
  'Abierta',
  'En revisión',
  'Propuesta enviada',
  'Finalizada · Aceptada',
  'Finalizada · Rechazada',
  'Finalizada · Expirada',
] as const;

export type QuoteStatus = typeof QUOTE_STATUSES[number];

export const PROJECT_TYPES = [
  'Mueble a medida',
  'Cocina integral',
  'Clóset / vestidor',
  'Centro de entrenamiento',
  'Otro',
] as const;

export type ProjectType = typeof PROJECT_TYPES[number];

// ── Item completo en DynamoDB ─────────────────────────────────────────────────

export interface QuoteItem {
  // Keys internas DynamoDB — nunca exponer en la API
  PK: string; // "QUOTE#ACW-2026-0042"
  SK: string; // "METADATA"

  // Identificación
  reference: string; // "ACW-2026-0042"   ← número de referencia público

  // Contacto (Paso 1)
  name:     string;
  phone:    string; // dígitos normalizados (sin espacios/guiones)
  email:    string; // puede ser ""
  address:  string; // puede ser ""

  // Proyecto — diseño personalizado (Paso 2)
  projectType: ProjectType;
  description: string;
  dimensions:  string; // puede ser ""
  finish:      string; // puede ser ""
  material:    string; // puede ser ""
  visualRef:   string; // URL de referencia, puede ser ""
  budget:      string; // rango, puede ser ""
  timeline:    string; // puede ser ""

  // Control
  status:    QuoteStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ── Shapes públicos de la API ─────────────────────────────────────────────────

// POST /quotes — body de entrada (todos los campos del form, sin keys internas)
export interface QuoteCreateInput {
  name:        string;
  phone:       string;
  email?:      string;
  address?:    string;
  projectType: string;
  description: string;
  dimensions?: string;
  finish?:     string;
  material?:   string;
  visualRef?:  string;
  budget?:     string;
  timeline?:   string;
}

// POST /quotes — respuesta exitosa
export interface QuoteCreateResult {
  reference: string;
  status:    QuoteStatus;
  createdAt: string;
}

// GET /quotes/{ref}?phone=... — respuesta exitosa (no expone PII completa)
export interface QuoteStatusResult {
  reference:   string;
  status:      QuoteStatus;
  projectType: ProjectType;
  createdAt:   string;
  updatedAt:   string;
}

// Counter item — secuencial por año
export interface CounterItem {
  PK:    string; // "COUNTER#QUOTES"
  SK:    string; // "2026"
  value: number;
}

// ── Notas internas (admin) ────────────────────────────────────────────────────
// Items separados en la misma tabla:
//   PK: QUOTE#<ref>   SK: NOTE#<isoTimestamp>
// El SK con timestamp ISO permite ordenar cronológicamente sin GSI.

export interface NoteItem {
  PK:        string; // "QUOTE#ACW-2026-0042"
  SK:        string; // "NOTE#2026-05-18T12:34:56.789Z"
  id:        string; // mismo timestamp del SK (para frontend)
  text:      string;
  author:    'admin';
  createdAt: string; // ISO 8601 — igual al timestamp del SK
}

export type NotePublic = Omit<NoteItem, 'PK' | 'SK'>;

// ── Shapes de la API admin ────────────────────────────────────────────────────

// GET /admin/quotes — resumen para listas (sin descripción completa)
export interface QuoteAdminSummary {
  reference:   string;
  name:        string;
  phone:       string;
  email:       string;
  projectType: ProjectType;
  status:      QuoteStatus;
  createdAt:   string;
  updatedAt:   string;
}

// GET /admin/quotes/{ref} — detalle completo + notas
export interface QuoteAdminDetail {
  reference:   string;
  name:        string;
  phone:       string;
  email:       string;
  address:     string;
  projectType: ProjectType;
  description: string;
  dimensions:  string;
  finish:      string;
  material:    string;
  visualRef:   string;
  budget:      string;
  timeline:    string;
  status:      QuoteStatus;
  createdAt:   string;
  updatedAt:   string;
  notes:       NotePublic[];
}

// PATCH /admin/quotes/{ref}/status — body
export interface UpdateStatusInput {
  status: QuoteStatus;
}

// POST /admin/quotes/{ref}/notes — body
export interface AddNoteInput {
  text: string;
}

// ── Envelope de API (compartido con products) ─────────────────────────────────

export interface ApiSuccess<T = unknown> {
  ok:    true;
  data:  T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  ok:    false;
  error: {
    code:      string;
    message:   string;
    requestId: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
