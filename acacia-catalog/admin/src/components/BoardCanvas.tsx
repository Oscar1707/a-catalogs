// admin/src/components/BoardCanvas.tsx
// Visualización SVG de un tablero con sus cortes y sobrantes.
// El SVG mantiene la proporción real del tablero (cm).

import type { PlacedCut, Remnant } from '@/types/corte';

interface Props {
  boardWidth:  number;
  boardLength: number;
  placed:      PlacedCut[];
  remnants:    Remnant[];
}

// Paleta cíclica para distinguir piezas. Usa tonos cercanos al amber/walnut
// de marca para mantener coherencia con el resto del admin.
const PALETTE = [
  '#ffb84a', // amber
  '#e3a242',
  '#c08540',
  '#8a6a3c',
  '#6b4a2b', // walnut
  '#a07a4a',
];

export function BoardCanvas({ boardWidth, boardLength, placed, remnants }: Props) {
  // Orientar el SVG con el lado mayor horizontal para usar el espacio del panel.
  const horizontal = boardLength >= boardWidth;
  const vbW = horizontal ? boardLength : boardWidth;
  const vbH = horizontal ? boardWidth  : boardLength;

  const transform = (x: number, y: number, w: number, h: number) =>
    horizontal
      ? { x: y, y: x, w: h, h: w }
      : { x: x, y: y, w: w, h: h };

  // Color por cutId (estable entre renders).
  const colorOf = new Map<string, string>();
  let i = 0;
  for (const p of placed) {
    if (!colorOf.has(p.cutId)) {
      colorOf.set(p.cutId, PALETTE[i % PALETTE.length]);
      i++;
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-sm border border-line/60 bg-ink-soft p-3">
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full h-auto"
        style={{ background: '#1a1a18' }}
      >
        {/* Marco del tablero */}
        <rect
          x={0}
          y={0}
          width={vbW}
          height={vbH}
          fill="#0f0f0d"
          stroke="#4a4a47"
          strokeWidth={0.4}
        />

        {/* Cortes colocados */}
        {placed.map((p, idx) => {
          const t = transform(p.x, p.y, p.width, p.length);
          const fill = colorOf.get(p.cutId) ?? '#ffb84a';
          const labelSize = Math.min(t.w, t.h) * 0.18;
          const dims = `${round1(p.width)} × ${round1(p.length)} cm`;
          const tooltip = `${p.label}  ·  ${dims}${p.rotated ? '  ·  rotado' : ''}`;
          return (
            <g key={`p${idx}`}>
              <title>{tooltip}</title>
              <rect
                x={t.x}
                y={t.y}
                width={t.w}
                height={t.h}
                fill={fill}
                fillOpacity={0.78}
                stroke="#0f0f0d"
                strokeWidth={0.5}
              />
              {labelSize >= 2 && (
                <text
                  x={t.x + t.w / 2}
                  y={t.y + t.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(labelSize, 8)}
                  fill="#0f0f0d"
                  fontWeight={500}
                  style={{ pointerEvents: 'none' }}
                >
                  {p.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Sobrantes (dashed) */}
        {remnants.map((r) => {
          const t = transform(r.x, r.y, r.width, r.length);
          return (
            <g key={`r${r.id}`}>
              <title>{`Sobrante  ·  ${r.width} × ${r.length} cm`}</title>
              <rect
                x={t.x}
                y={t.y}
                width={t.w}
                height={t.h}
                fill="#fafaf7"
                fillOpacity={0.04}
                stroke="#fafaf7"
                strokeOpacity={0.5}
                strokeWidth={0.3}
                strokeDasharray="1.5 1.2"
              />
              <text
                x={t.x + t.w / 2}
                y={t.y + t.h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.min(t.w, t.h) * 0.14}
                fill="#fafaf7"
                fillOpacity={0.55}
                style={{ pointerEvents: 'none' }}
              >
                {`${r.width}×${r.length}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
