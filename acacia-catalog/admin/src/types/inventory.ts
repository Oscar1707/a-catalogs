// admin/src/types/inventory.ts
// Tipos para el módulo de inventario.

export const INVENTORY_CATEGORIES = [
  'Madera', 'Tablero', 'Herraje', 'Acabados', 'Consumibles', 'Herramienta', 'Otro',
] as const;
export type InventoryCategory = typeof INVENTORY_CATEGORIES[number];

export type MovementType = 'entrada' | 'salida';

export interface InventoryItem {
  id:        string;
  name:      string;
  category:  InventoryCategory;
  quantity:  number;
  unit:      string;
  unitCost:  number;
  minStock:  number;
  notes?:    string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id:        string;
  itemId:    string;
  type:      MovementType;
  quantity:  number;
  note?:     string;
  date:      string;
  createdAt: string;
}
