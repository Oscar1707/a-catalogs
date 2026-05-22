// admin/src/lib/cortesStorage.ts
// Persistencia local de tableros guardados.
// Sin backend: los cortes guardados viven en localStorage del navegador.

import type { SavedBoard } from '@/types/corte';

const KEY = 'acacia.admin.cortes.v1';

export function listBoards(): SavedBoard[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedBoard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(boards: SavedBoard[]): void {
  localStorage.setItem(KEY, JSON.stringify(boards));
}

export function saveBoard(board: SavedBoard): void {
  const all = listBoards();
  const idx = all.findIndex((b) => b.id === board.id);
  if (idx >= 0) all[idx] = board;
  else all.unshift(board);
  writeAll(all);
}

export function deleteBoard(id: string): void {
  writeAll(listBoards().filter((b) => b.id !== id));
}

export function consumeRemnant(boardId: string, remnantId: string): void {
  const all = listBoards();
  const idx = all.findIndex((b) => b.id === boardId);
  if (idx < 0) return;
  all[idx] = {
    ...all[idx],
    remnants: all[idx].remnants.filter((r) => r.id !== remnantId),
  };
  writeAll(all);
}

/**
 * Devuelve sobrantes disponibles para un material dado, aplanando
 * cada remnant con su tablero de origen.
 */
export interface AvailableRemnant {
  boardId:     string;
  boardName:   string;
  remnantId:   string;
  width:       number;
  length:      number;
  createdAt:   string;
}

export function listRemnantsByMaterial(material: string): AvailableRemnant[] {
  const out: AvailableRemnant[] = [];
  for (const b of listBoards()) {
    if (b.material !== material) continue;
    for (const r of b.remnants) {
      out.push({
        boardId:   b.id,
        boardName: b.name,
        remnantId: r.id,
        width:     r.width,
        length:    r.length,
        createdAt: b.createdAt,
      });
    }
  }
  return out.sort((a, b) => b.width * b.length - a.width * a.length);
}
