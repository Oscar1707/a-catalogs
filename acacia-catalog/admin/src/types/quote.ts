// admin/src/types/quote.ts
// Mirror exacto de backend/src/types/quote.ts (sin keys internas DynamoDB).

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

export interface NotePublic {
  id:        string;
  text:      string;
  author:    'admin';
  createdAt: string;
}

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
