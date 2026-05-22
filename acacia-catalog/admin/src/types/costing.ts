// admin/src/types/costing.ts
// Mirror del shape devuelto por el backend (acacia-backend).

export type CostingCategory = 'materiales' | 'mano_obra' | 'logistica';

export const COSTING_CATEGORIES: CostingCategory[] = [
  'materiales',
  'mano_obra',
  'logistica',
];

export const CATEGORY_LABEL: Record<CostingCategory, string> = {
  materiales: 'Materiales',
  mano_obra:  'Mano de obra',
  logistica:  'Logística',
};

export interface CostingItem {
  id:         string;
  name:       string;
  category:   CostingCategory;
  qty:        number;
  unitPrice:  number;
  unit?:      string;
}

export interface Costing {
  id:           string;
  productName:  string;
  productId?:   string;
  notes?:       string;
  items:        CostingItem[];
  marginPct:    number;
  ivaIncluded:  boolean;
  createdAt:    string;
  updatedAt:    string;
}

export type CostingCreateInput = Omit<Costing, 'id' | 'createdAt' | 'updatedAt'>;
