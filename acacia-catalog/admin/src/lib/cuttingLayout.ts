// admin/src/lib/cuttingLayout.ts
// Algoritmo de bin-packing 2D tipo guillotina para distribuir cortes
// sobre un tablero. Considera el kerf (ancho de corte de la sierra)
// como espacio perdido entre piezas adyacentes.
//
// Si un corte tiene `joinable: true` y no cabe en el tablero, se parte
// en sub-piezas que sí caben (etiquetadas `1/N`, `2/N` …).

import type { Cut, PlacedCut, Remnant } from '@/types/corte';

interface FreeRect { x: number; y: number; w: number; h: number; }

interface ExpandedCut {
  cutId:    string;       // id original (compartido entre sub-piezas)
  label:    string;
  width:    number;
  length:   number;
  copyIdx:  number;
}

export interface LayoutResult {
  placed:   PlacedCut[];
  unplaced: { cutId: string; copyIdx: number; label: string }[];
  remnants: Remnant[];
  usedArea: number;
  totalArea: number;
}

export type CutFit = 'fits' | 'splittable' | 'too-large';

const MIN_REMNANT_CM = 5; // sobrantes menores a 5 cm en cualquier eje se descartan

/**
 * Indica si un corte (en cualquier orientación) cabe en un tablero.
 */
export function cutFitsBoard(
  cutW: number,
  cutH: number,
  boardW: number,
  boardH: number,
): boolean {
  return (cutW <= boardW && cutH <= boardH) ||
         (cutH <= boardW && cutW <= boardH);
}

/**
 * Determina cómo se puede aprovechar un corte sobre un tablero:
 *   - fits        → cabe entero
 *   - splittable  → no cabe entero, pero partiéndolo en N piezas iguales
 *                   sí caben (joinable)
 *   - too-large   → ni siquiera partido cabe (alguno de los dos lados es
 *                   mayor que el lado mayor del tablero)
 */
export function analyzeCut(
  cutW: number,
  cutH: number,
  boardW: number,
  boardH: number,
): CutFit {
  if (cutW <= 0 || cutH <= 0) return 'too-large';
  if (cutFitsBoard(cutW, cutH, boardW, boardH)) return 'fits';

  const boardLong = Math.max(boardW, boardH);
  const cutShort  = Math.min(cutW, cutH);

  // Para poder partir y unir 1D, el lado menor del corte debe caber en
  // alguno de los lados del tablero. El lado mayor se divide en N tramos.
  if (cutShort <= boardLong) return 'splittable';
  return 'too-large';
}

/**
 * Devuelve las sub-piezas en las que se debe partir un corte joinable
 * para que cada una quepa en el tablero. Mantiene el lado menor del
 * corte y divide el mayor en tramos iguales.
 */
function splitJoinable(
  cut: Cut,
  boardW: number,
  boardH: number,
): { width: number; length: number; parts: number } | null {
  const boardLong  = Math.max(boardW, boardH);
  const boardShort = Math.min(boardW, boardH);
  const cutLong    = Math.max(cut.width, cut.length);
  const cutShort   = Math.min(cut.width, cut.length);

  if (cutShort > boardLong) return null;

  // Caso A: el lado corto del corte cabe en el lado corto del tablero.
  // Partimos el lado largo en N tramos ≤ boardLong.
  if (cutShort <= boardShort) {
    const parts   = Math.ceil(cutLong / boardLong);
    const segment = cutLong / parts;
    return { width: cutShort, length: segment, parts };
  }

  // Caso B: el lado corto sólo cabe en el lado largo del tablero.
  // Entonces los tramos del lado largo deben caber en el lado corto.
  const parts   = Math.ceil(cutLong / boardShort);
  const segment = cutLong / parts;
  return { width: cutShort, length: segment, parts };
}

/**
 * Distribuye los cortes sobre un tablero de boardW × boardH (cm)
 * usando un kerf en mm.
 */
export function layoutCuts(
  boardW:  number,
  boardH:  number,
  cuts:    Cut[],
  kerfMm:  number,
): LayoutResult {
  const kerf = kerfMm / 10; // mm → cm
  const totalArea = boardW * boardH;

  // 1. Expandir cada Cut según qty y, si corresponde, según joinable.
  const expanded: ExpandedCut[] = [];
  for (const c of cuts) {
    if (c.width <= 0 || c.length <= 0 || c.qty <= 0) continue;

    let pieces: { width: number; length: number; label: string }[];

    const fits     = cutFitsBoard(c.width, c.length, boardW, boardH);
    const joinable = !!c.joinable;

    if (!fits && joinable) {
      const split = splitJoinable(c, boardW, boardH);
      if (split) {
        pieces = Array.from({ length: split.parts }, (_, i) => ({
          width:  split.width,
          length: split.length,
          label:  `${c.label || 'Pieza'} ${i + 1}/${split.parts}`,
        }));
      } else {
        // No se puede partir: queda como no encajable.
        pieces = [{ width: c.width, length: c.length, label: c.label || 'Pieza' }];
      }
    } else {
      pieces = [{ width: c.width, length: c.length, label: c.label || `${c.width}×${c.length}` }];
    }

    for (let i = 0; i < c.qty; i++) {
      for (const p of pieces) {
        expanded.push({
          cutId:   c.id,
          label:   p.label,
          width:   p.width,
          length:  p.length,
          copyIdx: i,
        });
      }
    }
  }

  // 2. Ordenar por lado mayor descendente para mejor empaque.
  expanded.sort(
    (a, b) =>
      Math.max(b.width, b.length) - Math.max(a.width, a.length),
  );

  const free: FreeRect[] = [{ x: 0, y: 0, w: boardW, h: boardH }];
  const placed: PlacedCut[] = [];
  const unplaced: { cutId: string; copyIdx: number; label: string }[] = [];
  let usedArea = 0;

  for (const item of expanded) {
    let bestIdx     = -1;
    let bestRotated = false;
    let bestScore   = Infinity;

    for (let i = 0; i < free.length; i++) {
      const r = free[i];
      if (item.width <= r.w && item.length <= r.h) {
        const score = (r.w - item.width) * (r.h - item.length);
        if (score < bestScore) {
          bestScore = score; bestIdx = i; bestRotated = false;
        }
      }
      if (item.length <= r.w && item.width <= r.h) {
        const score = (r.w - item.length) * (r.h - item.width);
        if (score < bestScore) {
          bestScore = score; bestIdx = i; bestRotated = true;
        }
      }
    }

    if (bestIdx < 0) {
      unplaced.push({ cutId: item.cutId, copyIdx: item.copyIdx, label: item.label });
      continue;
    }

    const r = free[bestIdx];
    const w = bestRotated ? item.length : item.width;
    const h = bestRotated ? item.width  : item.length;

    placed.push({
      cutId:   item.cutId,
      label:   item.label,
      copyIdx: item.copyIdx,
      x:       r.x,
      y:       r.y,
      width:   w,
      length:  h,
      rotated: bestRotated,
    });
    usedArea += w * h;

    free.splice(bestIdx, 1);

    const rightW = r.w - w - kerf;
    const downH  = r.h - h - kerf;

    if (rightW > 0) {
      free.push({ x: r.x + w + kerf, y: r.y, w: rightW, h: h });
    }
    if (downH > 0) {
      free.push({ x: r.x, y: r.y + h + kerf, w: r.w, h: downH });
    }
  }

  const remnants: Remnant[] = free
    .filter((r) => r.w >= MIN_REMNANT_CM && r.h >= MIN_REMNANT_CM)
    .map((r, i) => ({
      id:     `r${i}`,
      x:      r.x,
      y:      r.y,
      width:  round2(r.w),
      length: round2(r.h),
    }))
    .sort((a, b) => b.width * b.length - a.width * a.length);

  return { placed, unplaced, remnants, usedArea, totalArea };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
