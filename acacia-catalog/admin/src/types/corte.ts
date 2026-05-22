// admin/src/types/corte.ts
// Tipos para la calculadora de cortes.
// Todas las dimensiones se manejan en centímetros (cm).
// El kerf (desperdicio de la sierra) se almacena en milímetros y se
// convierte a cm al hacer el packing.

export type MaterialKey = 'mdf' | 'triplay' | 'tabla' | 'polin' | 'cinta';

export interface MaterialSpec {
  key:           MaterialKey;
  name:          string;
  defaultWidth:  number; // cm
  defaultLength: number; // cm
  hint:          string;
}

// Medidas estándar comunes en México.
export const MATERIALS: MaterialSpec[] = [
  {
    key:           'mdf',
    name:          'MDF',
    defaultWidth:  122,
    defaultLength: 244,
    hint:          'Tablero estándar 1.22 × 2.44 m',
  },
  {
    key:           'triplay',
    name:          'Triplay',
    defaultWidth:  122,
    defaultLength: 244,
    hint:          'Tablero estándar 1.22 × 2.44 m',
  },
  {
    key:           'tabla',
    name:          'Tabla de pino',
    defaultWidth:  30,
    defaultLength: 244,
    hint:          'Tabla estándar 30 × 244 cm',
  },
  {
    key:           'polin',
    name:          'Polín',
    defaultWidth:  9,
    defaultLength: 250,
    hint:          'Polín de pino 9 × 9 cm × 2.50 m',
  },
  {
    key:           'cinta',
    name:          'Cinta de canto',
    defaultWidth:  2.2,
    defaultLength: 500,
    hint:          'Rollo 22 mm × 5 m (ajustable)',
  },
];

export const getMaterial = (key: MaterialKey): MaterialSpec =>
  MATERIALS.find((m) => m.key === key) ?? MATERIALS[0];

export interface Cut {
  id:       string;
  label:    string;
  width:    number; // cm (lado menor)
  length:   number; // cm (lado mayor)
  qty:      number;
  /**
   * Si está en true y la pieza no cabe en el tablero, se parte en
   * sub-piezas que sí caben (cada una con etiqueta `1/N`, `2/N`, …).
   * Físicamente se unen al armar el mueble.
   */
  joinable?: boolean;
}

export interface PlacedCut {
  cutId:    string;
  label:    string;
  copyIdx:  number; // 0..qty-1
  x:        number; // cm desde top-left del tablero
  y:        number; // cm
  width:    number; // cm tras rotación
  length:   number; // cm tras rotación
  rotated:  boolean;
}

export interface Remnant {
  id:     string;
  x:      number;
  y:      number;
  width:  number;
  length: number;
}

export type BoardSource =
  | { kind: 'new' }
  | { kind: 'remnant'; boardId: string; remnantId: string };

export interface SavedBoard {
  id:           string;
  name:         string;
  createdAt:    string; // ISO
  material:     MaterialKey;
  boardWidth:   number;
  boardLength:  number;
  kerfMm:       number;
  cuts:         Cut[];
  placed:       PlacedCut[];
  unplaced:     { cutId: string; copyIdx: number; label: string }[];
  remnants:     Remnant[];
  source:       BoardSource;
}
