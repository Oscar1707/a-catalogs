// admin/src/types/finance.ts
// Tipos para el módulo de finanzas.

export type TransactionType = 'ingreso' | 'egreso';

export const INGRESO_CATEGORIES = ['Anticipo', 'Pago parcial', 'Liquidación', 'Otro'] as const;
export const EGRESO_CATEGORIES  = ['Materiales', 'Herramientas', 'Transporte', 'Nómina', 'Servicios', 'Otro'] as const;
export type IngresoCategory = typeof INGRESO_CATEGORIES[number];
export type EgresoCategory  = typeof EGRESO_CATEGORIES[number];
export type TransactionCategory = IngresoCategory | EgresoCategory;

export interface Transaction {
  id:              string;
  type:            TransactionType;
  amount:          number;
  concept:         string;
  category:        TransactionCategory;
  date:            string;               // YYYY-MM-DD
  note?:           string;
  quoteReference?: string;               // ACW-YYYY-NNNN
  createdAt:       string;
  updatedAt:       string;
}
