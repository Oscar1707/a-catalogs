// admin/src/pages/Cortes.tsx
// Calculadora de cortes. Permite:
//   1) Elegir material (MDF, Triplay, Tabla, Polín, Cinta) o partir de un
//      sobrante guardado.
//   2) Capturar cortes (alto × ancho × cantidad) con kerf configurable.
//   3) Visualizar el layout en SVG.
//   4) Guardar el tablero. Los sobrantes resultantes quedan disponibles
//      para reutilizarse como origen de un nuevo tablero.

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Link2, Pencil, Plus, Save, Scissors, Trash2, X } from 'lucide-react';
import {
  MATERIALS,
  getMaterial,
  type Cut,
  type MaterialKey,
  type SavedBoard,
  type BoardSource,
} from '@/types/corte';
import { analyzeCut, layoutCuts, type LayoutResult } from '@/lib/cuttingLayout';
import {
  consumeRemnant,
  deleteBoard,
  listBoards,
  listRemnantsByMaterial,
  saveBoard,
  type AvailableRemnant,
} from '@/lib/cortesStorage';
import { BoardCanvas } from '@/components/BoardCanvas';

const newId = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

const emptyCut = (): Cut => ({
  id:     newId(),
  label:  '',
  width:  0,
  length: 0,
  qty:    1,
});

export function Cortes() {
  const [material, setMaterial] = useState<MaterialKey>('mdf');
  const [boardWidth,  setBoardWidth]  = useState<number>(MATERIALS[0].defaultWidth);
  const [boardLength, setBoardLength] = useState<number>(MATERIALS[0].defaultLength);
  const [kerfMm, setKerfMm]   = useState<number>(3);
  const [source, setSource]   = useState<BoardSource>({ kind: 'new' });
  const [cuts, setCuts]       = useState<Cut[]>([emptyCut()]);
  const [layout, setLayout]   = useState<LayoutResult | null>(null);
  const [name, setName]       = useState<string>('');
  const [saved, setSaved]     = useState<SavedBoard[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Recargar tableros guardados al montar.
  useEffect(() => {
    setSaved(listBoards());
  }, []);

  // Sobrantes disponibles para el material elegido.
  const remnantsAvailable: AvailableRemnant[] = useMemo(
    () => listRemnantsByMaterial(material),
    // saved como dependencia para refrescar al guardar/borrar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [material, saved],
  );

  // Cuando cambia el material y la fuente es "nuevo", aplicar medidas estándar.
  const onPickMaterial = (key: MaterialKey) => {
    setMaterial(key);
    const spec = getMaterial(key);
    setSource({ kind: 'new' });
    setBoardWidth(spec.defaultWidth);
    setBoardLength(spec.defaultLength);
    setLayout(null);
  };

  const onPickRemnant = (r: AvailableRemnant | null) => {
    if (!r) {
      const spec = getMaterial(material);
      setSource({ kind: 'new' });
      setBoardWidth(spec.defaultWidth);
      setBoardLength(spec.defaultLength);
    } else {
      setSource({ kind: 'remnant', boardId: r.boardId, remnantId: r.remnantId });
      setBoardWidth(r.width);
      setBoardLength(r.length);
    }
    setLayout(null);
  };

  const updateCut = (id: string, patch: Partial<Cut>) =>
    setCuts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const removeCut = (id: string) =>
    setCuts((cs) => (cs.length === 1 ? cs : cs.filter((c) => c.id !== id)));

  const addCut = () => setCuts((cs) => [...cs, emptyCut()]);

  const onCalc = () => {
    const result = layoutCuts(boardWidth, boardLength, cuts, kerfMm);
    setLayout(result);
  };

  const onSave = () => {
    if (!layout) return;
    const isEdit = editingId !== null;
    const original = isEdit ? saved.find((b) => b.id === editingId) : undefined;
    const board: SavedBoard = {
      id:          editingId ?? newId(),
      name:        name.trim() || `${getMaterial(material).name} · ${new Date().toLocaleDateString('es-MX')}`,
      createdAt:   original?.createdAt ?? new Date().toISOString(),
      material,
      boardWidth,
      boardLength,
      kerfMm,
      cuts,
      placed:      layout.placed,
      unplaced:    layout.unplaced,
      remnants:    layout.remnants,
      source,
    };
    saveBoard(board);
    // Si es nuevo y partió de un sobrante, consumirlo del tablero origen.
    // En modo edición el sobrante ya fue consumido la primera vez.
    if (!isEdit && source.kind === 'remnant') {
      consumeRemnant(source.boardId, source.remnantId);
    }
    setSaved(listBoards());
    setName('');
    setCuts([emptyCut()]);
    setLayout(null);
    setEditingId(null);
    onPickMaterial(material);
  };

  const onEdit = (board: SavedBoard) => {
    setEditingId(board.id);
    setName(board.name);
    setMaterial(board.material);
    setBoardWidth(board.boardWidth);
    setBoardLength(board.boardLength);
    setKerfMm(board.kerfMm);
    setSource(board.source);
    // Si quedó algún corte vacío, asegurar al menos un row editable.
    setCuts(board.cuts.length > 0 ? board.cuts : [emptyCut()]);
    setLayout({
      placed:    board.placed,
      unplaced:  board.unplaced,
      remnants:  board.remnants,
      usedArea:  board.placed.reduce((s, p) => s + p.width * p.length, 0),
      totalArea: board.boardWidth * board.boardLength,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setName('');
    setCuts([emptyCut()]);
    setLayout(null);
    onPickMaterial(material);
  };

  const onDelete = (id: string) => {
    if (editingId === id) onCancelEdit();
    deleteBoard(id);
    setSaved(listBoards());
  };

  const utilizationPct = layout
    ? Math.round((layout.usedArea / layout.totalArea) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
      {/* ── Encabezado ─────────────────────────────────────────── */}
      <header className="mb-12 border-b border-line/40 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-light uppercase text-amber tracking-[0.3em]">
            <Scissors size={12} strokeWidth={1.2} /> Calculadora
          </p>
          <h1 className="text-3xl font-light leading-[1.1] text-bone md:text-4xl">
            Consumo de cortes
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-mute">
            Calcula la distribución óptima de cortes sobre un tablero,
            considerando el desperdicio de la sierra. Guarda los tableros
            para reutilizar los sobrantes en cortes posteriores.
          </p>
          {editingId && (
            <div className="mt-6 flex items-center justify-between gap-4 rounded-sm border border-amber/50 bg-amber/5 px-4 py-2.5">
              <p className="text-[11px] font-light text-amber tracking-[0.15em]">
                Editando &middot; {name || 'sin nombre'}
              </p>
              <button
                type="button"
                onClick={onCancelEdit}
                className="text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:text-bone"
              >
                Cancelar
              </button>
            </div>
          )}
        </motion.div>
      </header>

      {/* ── Configuración ──────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          {/* Material */}
          <div>
            <h2 className="mb-4 text-[10px] font-light uppercase text-mute tracking-[0.3em]">
              Material
            </h2>
            <div className="grid grid-cols-2 gap-px bg-line/40 md:grid-cols-3">
              {MATERIALS.map((m) => {
                const active = material === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => onPickMaterial(m.key)}
                    className={`bg-ink p-4 text-left transition-colors ${
                      active ? 'text-bone' : 'text-mute hover:text-bone'
                    }`}
                  >
                    <span className="block text-[11px] font-light uppercase tracking-[0.2em]">
                      {m.name}
                    </span>
                    <span className={`mt-1 block text-[10px] font-light ${active ? 'text-amber' : 'text-mute-dark'}`}>
                      {m.defaultWidth} × {m.defaultLength} cm
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Origen del tablero */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[10px] font-light uppercase text-mute tracking-[0.3em]">
                Origen del tablero
              </h2>
              {remnantsAvailable.length > 0 && (
                <span className="text-[10px] font-light text-mute-dark tracking-[0.2em]">
                  {remnantsAvailable.length} sobrante{remnantsAvailable.length === 1 ? '' : 's'} disponible{remnantsAvailable.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* Card: tablero nuevo */}
              <button
                type="button"
                onClick={() => onPickRemnant(null)}
                className={`rounded-sm border p-3 text-left transition-colors ${
                  source.kind === 'new'
                    ? 'border-amber bg-amber/5'
                    : 'border-line/60 bg-ink-soft hover:border-line'
                }`}
              >
                <span className="block text-[11px] font-light uppercase text-bone tracking-[0.2em]">
                  Tablero nuevo
                </span>
                <span className="mt-1 block text-[10px] font-light text-mute">
                  {getMaterial(material).defaultWidth} × {getMaterial(material).defaultLength} cm
                </span>
              </button>

              {/* Cards: cada sobrante */}
              {remnantsAvailable.map((r) => {
                const active = source.kind === 'remnant'
                  && source.boardId === r.boardId
                  && source.remnantId === r.remnantId;
                return (
                  <button
                    key={`${r.boardId}|${r.remnantId}`}
                    type="button"
                    onClick={() => onPickRemnant(r)}
                    className={`rounded-sm border p-3 text-left transition-colors ${
                      active
                        ? 'border-amber bg-amber/5'
                        : 'border-line/60 bg-ink-soft hover:border-line'
                    }`}
                  >
                    <span className="block text-[11px] font-light uppercase text-bone tracking-[0.2em]">
                      Sobrante {r.width} × {r.length} cm
                    </span>
                    <span className="mt-1 block truncate text-[10px] font-light text-mute">
                      {r.boardName}
                    </span>
                  </button>
                );
              })}
            </div>

            {source.kind === 'remnant' && (
              <p className="mt-2 text-[11px] font-light italic text-mute">
                Al guardar, este sobrante se descontará del tablero original.
              </p>
            )}
          </div>

          {/* Medidas y kerf */}
          <div className="grid grid-cols-3 gap-4">
            <LabeledNumber
              label="Ancho (cm)"
              value={boardWidth}
              onChange={setBoardWidth}
              disabled={source.kind === 'remnant'}
            />
            <LabeledNumber
              label="Largo (cm)"
              value={boardLength}
              onChange={setBoardLength}
              disabled={source.kind === 'remnant'}
            />
            <LabeledNumber
              label="Sierra (mm)"
              value={kerfMm}
              onChange={setKerfMm}
              step={0.5}
            />
          </div>
        </div>

        {/* Cortes a realizar */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[10px] font-light uppercase text-mute tracking-[0.3em]">
              Cortes
            </h2>
            <button
              type="button"
              onClick={addCut}
              className="inline-flex items-center gap-1.5 text-[10px] font-light uppercase text-amber tracking-[0.25em] hover:text-bone"
            >
              <Plus size={12} strokeWidth={1.4} /> Agregar
            </button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-light uppercase text-mute-dark tracking-[0.15em]">
              <span className="col-span-4">Etiqueta</span>
              <span className="col-span-2 text-right">Ancho</span>
              <span className="col-span-2 text-right">Alto</span>
              <span className="col-span-1 text-right">Qty</span>
              <span className="col-span-2 text-center">Unir</span>
              <span className="col-span-1" />
            </div>

            {cuts.map((c) => {
              const fit = analyzeCut(c.width, c.length, boardWidth, boardLength);
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-12 items-center gap-2 rounded-sm border border-line/40 bg-ink-soft p-2"
                >
                  <div className="col-span-4 flex items-center gap-2">
                    <FitIndicator fit={fit} joinable={!!c.joinable} />
                    <input
                      type="text"
                      value={c.label}
                      onChange={(e) => updateCut(c.id, { label: e.target.value })}
                      placeholder="Lateral / Base / Puerta"
                      className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm font-light text-bone placeholder:text-mute-dark focus:outline-none"
                    />
                  </div>
                  <NumberCell value={c.width}  onChange={(v) => updateCut(c.id, { width: v })}  />
                  <NumberCell value={c.length} onChange={(v) => updateCut(c.id, { length: v })} />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={Number.isFinite(c.qty) && c.qty !== 0 ? c.qty : ''}
                    step={1}
                    onChange={(e) => updateCut(c.id, { qty: parseFloat(e.target.value) || 0 })}
                    className="col-span-1 bg-transparent px-1 py-1 text-right text-sm font-light text-bone focus:outline-none"
                  />
                  <div className="col-span-2 flex items-center justify-center">
                    {fit === 'splittable' ? (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] font-light uppercase text-mute tracking-[0.15em] hover:text-bone">
                        <input
                          type="checkbox"
                          checked={!!c.joinable}
                          onChange={(e) => updateCut(c.id, { joinable: e.target.checked })}
                          className="h-3.5 w-3.5 accent-amber"
                        />
                        Unir
                      </label>
                    ) : (
                      <span className="text-[10px] font-light text-mute-dark tracking-[0.15em]">—</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCut(c.id)}
                    aria-label="Quitar corte"
                    className="col-span-1 inline-flex items-center justify-end text-mute-dark hover:text-amber"
                  >
                    <X size={14} strokeWidth={1.4} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onCalc}
            className="mt-6 w-full rounded-sm bg-amber py-3 text-[11px] font-light uppercase text-ink tracking-[0.3em] transition-colors hover:bg-amber-soft"
          >
            Calcular distribución
          </button>
        </div>
      </section>

      {/* ── Resultado ──────────────────────────────────────────── */}
      {layout && (
        <section className="mt-16 border-t border-line/40 pt-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[2fr_1fr]">
            <div>
              <h2 className="mb-4 text-[10px] font-light uppercase text-mute tracking-[0.3em]">
                Distribución
              </h2>
              <BoardCanvas
                boardWidth={boardWidth}
                boardLength={boardLength}
                placed={layout.placed}
                remnants={layout.remnants}
              />
            </div>

            <div className="space-y-6">
              <Stat
                label="Aprovechamiento"
                value={`${utilizationPct}%`}
                hint={`${Math.round(layout.usedArea)} / ${Math.round(layout.totalArea)} cm²`}
              />
              <Stat
                label="Piezas colocadas"
                value={`${layout.placed.length}`}
                hint={layout.unplaced.length ? `${layout.unplaced.length} no encajan` : 'Todas encajan'}
                warn={layout.unplaced.length > 0}
              />
              <Stat
                label="Sobrantes utilizables"
                value={`${layout.remnants.length}`}
                hint={
                  layout.remnants.length
                    ? layout.remnants.slice(0, 3).map((r) => `${r.width}×${r.length}`).join(' · ')
                    : '—'
                }
              />

              <div>
                <label className="mb-2 block text-[10px] font-light uppercase text-mute tracking-[0.3em]">
                  Nombre del tablero
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Closet recámara · 2026-05-19"
                  className="w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone placeholder:text-mute-dark focus:outline-none"
                />
                <button
                  type="button"
                  onClick={onSave}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-amber py-2.5 text-[11px] font-light uppercase text-amber tracking-[0.3em] hover:bg-amber hover:text-ink"
                >
                  <Save size={12} strokeWidth={1.4} /> {editingId ? 'Actualizar tablero' : 'Guardar tablero'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Tableros guardados ─────────────────────────────────── */}
      <section className="mt-20 border-t border-line/40 pt-12">
        <h2 className="mb-6 text-[10px] font-light uppercase text-mute tracking-[0.3em]">
          Tableros guardados
        </h2>
        {saved.length === 0 ? (
          <p className="text-[12px] font-light italic text-mute-dark">
            Aún no hay tableros guardados. Calcula una distribución y guárdala
            para reutilizar sus sobrantes.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-px bg-line/40 md:grid-cols-2 lg:grid-cols-3">
            {saved.map((b) => {
              const isEditing = editingId === b.id;
              return (
                <li
                  key={b.id}
                  className={`bg-ink p-5 ${isEditing ? 'ring-1 ring-amber/40' : ''}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-light text-bone">{b.name}</p>
                      <p className="mt-1 text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
                        {getMaterial(b.material).name} · {b.boardWidth} × {b.boardLength} cm · kerf {b.kerfMm} mm
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onEdit(b)}
                        aria-label="Editar"
                        title="Editar tablero"
                        className="text-mute hover:text-amber"
                      >
                        <Pencil size={14} strokeWidth={1.3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(b.id)}
                        aria-label="Eliminar"
                        title="Eliminar tablero"
                        className="text-mute-dark hover:text-amber"
                      >
                        <Trash2 size={14} strokeWidth={1.3} />
                      </button>
                    </div>
                  </div>

                  <BoardCanvas
                    boardWidth={b.boardWidth}
                    boardLength={b.boardLength}
                    placed={b.placed}
                    remnants={b.remnants}
                  />

                  {/* Lista de especificaciones de los cortes */}
                  {b.cuts.length > 0 && (
                    <div className="mt-4 border-t border-line/40 pt-3">
                      <p className="mb-2 text-[9px] font-light uppercase text-mute-dark tracking-[0.2em]">
                        Cortes
                      </p>
                      <ul className="space-y-1.5">
                        {b.cuts
                          .filter((c) => c.width > 0 && c.length > 0)
                          .map((c) => (
                            <li
                              key={c.id}
                              className="flex items-center justify-between gap-2 text-[11px] font-light"
                            >
                              <span className="truncate text-bone">
                                {c.label || `${c.width}×${c.length}`}
                                {c.joinable && (
                                  <span className="ml-2 text-[9px] uppercase tracking-[0.15em] text-amber/70">unir</span>
                                )}
                              </span>
                              <span className="shrink-0 text-mute">
                                {c.width} × {c.length} cm
                                <span className="ml-2 text-mute-dark">× {c.qty}</span>
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[10px] font-light text-mute">
                    <span>
                      {b.placed.length} piezas · {b.remnants.length} sobrantes
                    </span>
                    <span className="text-mute-dark">
                      {new Date(b.createdAt).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────

interface LabeledNumberProps {
  label:    string;
  value:    number;
  onChange: (v: number) => void;
  step?:    number;
  disabled?: boolean;
}
function LabeledNumber({ label, value, onChange, step, disabled }: LabeledNumberProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-light uppercase text-mute tracking-[0.25em]">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ''}
        step={step ?? 0.1}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone focus:outline-none disabled:opacity-50"
      />
    </label>
  );
}

interface NumberCellProps {
  value:    number;
  onChange: (v: number) => void;
  step?:    number;
}
function NumberCell({ value, onChange, step }: NumberCellProps) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) && value !== 0 ? value : ''}
      step={step ?? 0.1}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="col-span-2 bg-transparent px-2 py-1 text-right text-sm font-light text-bone focus:outline-none"
    />
  );
}

interface FitIndicatorProps {
  fit:      'fits' | 'splittable' | 'too-large';
  joinable: boolean;
}
function FitIndicator({ fit, joinable }: FitIndicatorProps) {
  if (fit === 'fits') {
    return (
      <span
        title="Cabe entero en el tablero"
        aria-label="Cabe entero en el tablero"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-amber"
      >
        <Check size={12} strokeWidth={1.6} />
      </span>
    );
  }
  if (fit === 'splittable') {
    return (
      <span
        title={joinable ? 'Se partirá y unirá al armar' : 'No cabe entero — activa "Unir" para partirlo'}
        aria-label="Se puede partir en piezas"
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          joinable ? 'text-amber' : 'text-mute'
        }`}
      >
        <Link2 size={12} strokeWidth={1.6} />
      </span>
    );
  }
  return (
    <span
      title="No cabe en el tablero ni partiéndolo"
      aria-label="No cabe en el tablero"
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-mute-dark"
    >
      <AlertTriangle size={12} strokeWidth={1.6} />
    </span>
  );
}

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}
function Stat({ label, value, hint, warn }: StatProps) {
  return (
    <div className="border-l border-amber/50 pl-4">
      <p className="text-[10px] font-light uppercase text-mute tracking-[0.3em]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-light ${warn ? 'text-amber' : 'text-bone'}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] font-light text-mute-dark">{hint}</p>}
    </div>
  );
}
