// backend/src/types/costing.ts
// Tipos del costeo de productos.
// Tabla: acacia-products  ·  PK: COSTING#<id>  ·  SK: METADATA

export type CostingCategory = 'materiales' | 'mano_obra' | 'logistica';

export const COSTING_CATEGORIES: CostingCategory[] = [
  'materiales',
  'mano_obra',
  'logistica',
];

export interface CostingItem {
  id:         string;          // uuid local dentro del costing
  name:       string;          // "Tablero MDF", "LED 5m", "Mano de obra"…
  category:   CostingCategory;
  qty:        number;          // cantidad (m, pz, hrs, etc.)
  unitPrice:  number;          // MXN sin IVA
  unit?:      string;          // "m", "pz", "hr", "kg"  (sólo display)
}

export interface CostingPublic {
  id:           string;
  productName:  string;        // "Lumina", "Mikolos", … (texto libre)
  productId?:   string;        // opcional — link al producto del catálogo
  notes?:       string;
  items:        CostingItem[];
  marginPct:    number;        // ej. 40 → precio = costo × 1.40
  ivaIncluded:  boolean;       // si true, el precio público incluye 16 % IVA
  createdAt:    string;
  updatedAt:    string;
}

// Shape almacenado en DynamoDB (CostingPublic + claves PK/SK).
export interface CostingItemDB extends CostingPublic {
  PK: string;
  SK: string;
}

export type CostingCreateInput = Omit<
  CostingPublic,
  'id' | 'createdAt' | 'updatedAt'
>;

export type CostingUpdateInput = Partial<CostingCreateInput>;
