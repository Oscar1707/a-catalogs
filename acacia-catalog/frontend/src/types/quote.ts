// frontend/src/types/quote.ts
// Mirror exacto de backend/src/types/quote.ts.
// Las claves PK / SK nunca aparecen en el frontend.

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

export interface QuoteCreateResult {
  reference: string;
  status:    QuoteStatus;
  createdAt: string;
}

export interface QuoteStatusResult {
  reference:   string;
  status:      QuoteStatus;
  projectType: ProjectType;
  createdAt:   string;
  updatedAt:   string;
}
