// backend/src/types/finance.ts
// Tipos para el módulo de finanzas (ingresos y egresos).

export type TransactionType = 'ingreso' | 'egreso';

export type IngresoCategory = 'Anticipo' | 'Pago parcial' | 'Liquidación' | 'Otro';
export type EgresoCategory  = 'Materiales' | 'Herramientas' | 'Transporte' | 'Nómina' | 'Servicios' | 'Otro';
export type TransactionCategory = IngresoCategory | EgresoCategory;

export interface TransactionItem {
  PK:              string;               // TRANSACTION#<id>
  SK:              'META';
  id:              string;
  type:            TransactionType;
  amount:          number;               // MXN
  concept:         string;
  category:        TransactionCategory;
  date:            string;               // YYYY-MM-DD
  note?:           string;
  quoteReference?: string;               // ACW-YYYY-NNNN si viene de una cotización
  createdAt:       string;               // ISO
  updatedAt:       string;               // ISO
}

export type TransactionPublic = Omit<TransactionItem, 'PK' | 'SK'>;
