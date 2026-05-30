// admin/src/lib/cortesStorage.ts
// Persistencia de tableros de corte.
// Fuente principal: DynamoDB vía API admin.
// Cache local: localStorage (respaldo offline + evita parpadeos en UI).

import type { SavedBoard } from '@/types/corte';
import * as boardsApi from '@/api/boards';

const CACHE_KEY = 'acacia.admin.cortes.v2';

// ─── Cache localStorage ───────────────────────────────────────────────────────

function readCache(): SavedBoard[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedBoard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeCache(boards: SavedBoard[]): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(boards)); } catch { /* noop */ }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/** Carga desde DynamoDB y actualiza el cache. */
export async function fetchBoards(): Promise<SavedBoard[]> {
  const boards = await boardsApi.listBoards();
  writeCache(boards);
  return boards;
}

/** Devuelve el cache local instantáneamente (para UI inmediata mientras carga). */
export function listBoards(): SavedBoard[] {
  return readCache();
}

/** Guarda en DynamoDB y actualiza el cache. */
export async function saveBoard(board: SavedBoard): Promise<SavedBoard> {
  const saved = await boardsApi.upsertBoard(board);
  const all   = readCache();
  const idx   = all.findIndex((b) => b.id === board.id);
  if (idx >= 0) all[idx] = saved; else all.unshift(saved);
  writeCache(all);
  return saved;
}

/** Elimina de DynamoDB y del cache. */
export async function deleteBoardRemote(id: string): Promise<void> {
  await boardsApi.deleteBoard(id);
  writeCache(readCache().filter((b) => b.id !== id));
}

/**
 * Marca un sobrante como consumido (actualiza el tablero en DynamoDB).
 */
export async function consumeRemnant(boardId: string, remnantId: string): Promise<void> {
  const all = readCache();
  const idx = all.findIndex((b) => b.id === boardId);
  if (idx < 0) return;
  const updated: SavedBoard = {
    ...all[idx],
    remnants: all[idx].remnants.filter((r) => r.id !== remnantId),
  };
  await saveBoard(updated);
}

/**
 * Devuelve sobrantes disponibles para un material dado.
 * Lee del cache local para respuesta inmediata.
 */
export interface AvailableRemnant {
  boardId:   string;
  boardName: string;
  remnantId: string;
  width:     number;
  length:    number;
  createdAt: string;
}

export function listRemnantsByMaterial(material: string): AvailableRemnant[] {
  const out: AvailableRemnant[] = [];
  for (const b of readCache()) {
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
