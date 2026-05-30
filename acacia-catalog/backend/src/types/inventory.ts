// backend/src/types/inventory.ts
// Tipos para el módulo de inventario de materiales e insumos.

export type InventoryCategory =
  | 'Madera'
  | 'Tablero'
  | 'Herraje'
  | 'Acabados'
  | 'Consumibles'
  | 'Herramienta'
  | 'Otro';

export type MovementType = 'entrada' | 'salida';

export interface InventoryItem {
  PK:        string;              // INVENTORY#<id>
  SK:        'META';
  id:        string;
  name:      string;
  category:  InventoryCategory;
  quantity:  number;              // stock actual
  unit:      string;              // pza, m², ml, kg, lt, rollo, etc.
  unitCost:  number;              // MXN por unidad
  minStock:  number;              // alerta cuando quantity < minStock
  notes?:    string;
  createdAt: string;              // ISO
  updatedAt: string;              // ISO
}

export interface InventoryMovement {
  PK:        string;              // INVENTORY#<id>
  SK:        string;              // MOV#<iso>#<shortId>
  id:        string;
  itemId:    string;
  type:      MovementType;
  quantity:  number;
  note?:     string;
  date:      string;              // YYYY-MM-DD
  createdAt: string;              // ISO
}

export type InventoryPublic  = Omit<InventoryItem,     'PK' | 'SK'>;
export type MovementPublic   = Omit<InventoryMovement, 'PK' | 'SK'>;
