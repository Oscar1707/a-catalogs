// backend/src/types/board.ts
// Tipos del módulo de cortes (tableros guardados).
// Tabla: acacia-products · PK: BOARD#<id> · SK: METADATA

export type MaterialKey = 'mdf' | 'triplay' | 'tabla' | 'polin' | 'cinta';

export interface Cut {
  id:        string;
  label:     string;
  width:     number;
  length:    number;
  qty:       number;
  joinable?: boolean;
}

export interface PlacedCut {
  cutId:   string;
  label:   string;
  copyIdx: number;
  x:       number;
  y:       number;
  width:   number;
  length:  number;
  rotated: boolean;
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

export interface BoardItem {
  // DynamoDB keys
  PK: string;   // BOARD#<id>
  SK: string;   // METADATA

  // Datos del tablero
  id:          string;
  name:        string;
  createdAt:   string;  // ISO
  updatedAt:   string;  // ISO
  material:    MaterialKey;
  boardWidth:  number;
  boardLength: number;
  kerfMm:      number;
  cuts:        Cut[];
  placed:      PlacedCut[];
  unplaced:    { cutId: string; copyIdx: number; label: string }[];
  remnants:    Remnant[];
  source:      BoardSource;
}

// Shape público (sin PK/SK)
export type BoardPublic = Omit<BoardItem, 'PK' | 'SK'>;
