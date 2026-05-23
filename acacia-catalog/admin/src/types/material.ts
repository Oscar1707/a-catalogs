// admin/src/types/material.ts
export interface Material {
  id:        string;
  name:      string;      // título del material
  qty:       number;      // cantidad default
  unit:      string;      // unidad (pz, m, kg, hr…)
  unitPrice: number;      // precio unitario MXN
}
