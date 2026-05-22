// admin/src/pages/Costos.tsx
// Calculadora de costos y precio final por modelo.
//   1) Selecciona un modelo (sugerencias del catálogo o texto libre).
//   2) Captura items por categoría (materiales, mano de obra, logística).
//   3) Aplica margen % sobre el costo total y opcionalmente IVA 16 %.
//   4) Guarda el costeo en DynamoDB para reutilizarlo.

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Calculator,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { listProducts } from '@/api/products';
import {
  createCosting,
  deleteCosting,
  listCostings,
  updateCosting,
} from '@/api/costings';
import {
  CATEGORY_LABEL,
  COSTING_CATEGORIES,
  type Costing,
  type CostingCategory,
  type CostingCreateInput,
  type CostingItem,
} from '@/types/costing';

const IVA_RATE = 0.16;

const newId = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

const blankItem = (
  category: CostingCategory,
  name = '',
  unit?: string,
): CostingItem => ({
  id:        newId(),
  name,
  category,
  qty:       1,        // default 1 → si sólo escribes el precio unitario, ya cuenta
  unitPrice: 0,
  unit,
});

// Lista por defecto al iniciar un costeo nuevo. Mapea los conceptos que el
// usuario mencionó originalmente a categorías razonables.
const DEFAULT_ITEMS = (): CostingItem[] => [
  blankItem('materiales', 'Tablero',   'pz'),
  blankItem('materiales', 'LED',       'm'),
  blankItem('materiales', 'Soportes',  'pz'),
  blankItem('materiales', 'Pegamento', 'kg'),
  blankItem('materiales', 'Batería',   'pz'),
  blankItem('materiales', 'Riel',      'pz'),
  blankItem('mano_obra',  'Mano de obra', 'hr'),
  blankItem('logistica',  'Empaque',   'pz'),
  blankItem('logistica',  'Envío',     'pz'),
];

interface DraftState {
  id?:          string;
  productName:  string;
  productId?:   string;
  notes:        string;
  items:        CostingItem[];
  marginPct:    number;
  ivaIncluded:  boolean;
}

const blankDraft = (): DraftState => ({
  productName: '',
  productId:   undefined,
  notes:       '',
  items:       DEFAULT_ITEMS(),
  marginPct:   40,
  ivaIncluded: false,
});

export function Costos() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DraftState>(blankDraft);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const productsQ = useQuery({
    queryKey: ['products-admin'],
    queryFn:  listProducts,
    staleTime: 1000 * 60 * 5,
  });

  const costingsQ = useQuery({
    queryKey: ['costings'],
    queryFn:  listCostings,
    staleTime: 1000 * 30,
  });

  // ── Derivados de cálculo ────────────────────────────────────────────────
  const totals = useMemo(() => calcTotals(draft), [draft]);

  // ── Sugerencias de modelos (catálogo + costeos previos) ─────────────────
  const productSuggestions = useMemo<string[]>(() => {
    const fromCatalog = (productsQ.data ?? []).map((p) => p.name);
    const fromCostings = (costingsQ.data ?? []).map((c) => c.productName);
    return Array.from(new Set([...fromCatalog, ...fromCostings])).sort();
  }, [productsQ.data, costingsQ.data]);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  // ── Acciones ────────────────────────────────────────────────────────────
  const onPickProduct = (name: string) => {
    const match = (productsQ.data ?? []).find((p) => p.name === name);
    setDraft((d) => ({
      ...d,
      productName: name,
      productId:   match?.id,
    }));
  };

  const onLoad = (c: Costing) => {
    setDraft({
      id:           c.id,
      productName:  c.productName,
      productId:    c.productId,
      notes:        c.notes ?? '',
      items:        c.items.length > 0 ? c.items : DEFAULT_ITEMS(),
      marginPct:    c.marginPct,
      ivaIncluded:  c.ivaIncluded,
    });
    setSavedAt(null);
  };

  const onNew = () => {
    setDraft(blankDraft());
    setSavedAt(null);
  };

  const updateItem = (id: string, patch: Partial<CostingItem>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));

  const removeItem = (id: string) =>
    setDraft((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));

  const addItem = (category: CostingCategory) =>
    setDraft((d) => ({ ...d, items: [...d.items, blankItem(category)] }));

  const onSave = async () => {
    if (!draft.productName.trim()) {
      alert('Selecciona o escribe un modelo antes de guardar.');
      return;
    }
    setSaving(true);
    try {
      const payload: CostingCreateInput = {
        productName: draft.productName.trim(),
        productId:   draft.productId,
        notes:       draft.notes.trim() || undefined,
        items:       draft.items
          .filter((it) => it.name.trim().length > 0)
          .map((it) => ({
            ...it,
            name:      it.name.trim(),
            qty:       Number.isFinite(it.qty)       ? it.qty       : 0,
            unitPrice: Number.isFinite(it.unitPrice) ? it.unitPrice : 0,
          })),
        marginPct:   draft.marginPct,
        ivaIncluded: draft.ivaIncluded,
      };

      const saved = draft.id
        ? await updateCosting(draft.id, payload)
        : await createCosting(payload);

      setDraft((d) => ({ ...d, id: saved.id }));
      setSavedAt(new Date().toISOString());
      qc.invalidateQueries({ queryKey: ['costings'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar este costeo?')) return;
    try {
      await deleteCosting(id);
      if (draft.id === id) onNew();
      qc.invalidateQueries({ queryKey: ['costings'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
      <header className="mb-12 border-b border-line/40 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-light uppercase text-amber tracking-[0.3em]">
            <Calculator size={12} strokeWidth={1.2} /> Calculadora
          </p>
          <h1 className="text-3xl font-light leading-[1.1] text-bone md:text-4xl">
            Costos y precio final
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-mute">
            Captura los conceptos por modelo y obtén el costo total, el precio
            con margen y, opcionalmente, con IVA. Guarda el costeo para
            reutilizarlo y comparar versiones.
          </p>
        </motion.div>
      </header>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* ── Columna izquierda: modelo + items ──────────────────────── */}
        <div className="space-y-8">
          <div>
            <label className="mb-2 block text-[10px] font-light uppercase text-mute tracking-[0.3em]">
              Modelo
            </label>
            <input
              type="text"
              list="costos-product-suggestions"
              value={draft.productName}
              onChange={(e) => onPickProduct(e.target.value)}
              placeholder="Lumina, Mikolos, Eslovia, Lamben…"
              className="w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2.5 text-base font-light text-bone placeholder:text-mute-dark focus:outline-none"
            />
            <datalist id="costos-product-suggestions">
              {productSuggestions.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            {draft.productId && (
              <p className="mt-1.5 text-[10px] font-light text-amber tracking-[0.15em]">
                Vinculado al catálogo · id {draft.productId}
              </p>
            )}
          </div>

          {/* Items por categoría */}
          {COSTING_CATEGORIES.map((cat) => {
            const items = draft.items.filter((it) => it.category === cat);
            return (
              <div key={cat}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[10px] font-light uppercase text-mute tracking-[0.3em]">
                    {CATEGORY_LABEL[cat]}
                  </h2>
                  <button
                    type="button"
                    onClick={() => addItem(cat)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-light uppercase text-amber tracking-[0.25em] hover:text-bone"
                  >
                    <Plus size={12} strokeWidth={1.4} /> Agregar
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-light uppercase text-mute-dark tracking-[0.15em]">
                    <span className="col-span-5">Concepto</span>
                    <span className="col-span-2 text-right">Cant.</span>
                    <span className="col-span-1 text-center">Unidad</span>
                    <span className="col-span-2 text-right">$ unit.</span>
                    <span className="col-span-1 text-right">Subt.</span>
                    <span className="col-span-1" />
                  </div>

                  {items.length === 0 ? (
                    <p className="px-2 text-[11px] font-light italic text-mute-dark">
                      Sin conceptos. Agrega uno con el botón de arriba.
                    </p>
                  ) : items.map((it) => {
                    const subtotal = it.qty * it.unitPrice;
                    return (
                      <div
                        key={it.id}
                        className="grid grid-cols-12 items-center gap-2 rounded-sm border border-line/40 bg-ink-soft p-2"
                      >
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => updateItem(it.id, { name: e.target.value })}
                          placeholder="Concepto"
                          className="col-span-5 bg-transparent px-2 py-1 text-sm font-light text-bone placeholder:text-mute-dark focus:outline-none"
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          value={it.qty || ''}
                          step={0.1}
                          onChange={(e) => updateItem(it.id, { qty: parseFloat(e.target.value) || 0 })}
                          className="col-span-2 bg-transparent px-2 py-1 text-right text-sm font-light text-bone focus:outline-none"
                        />
                        <input
                          type="text"
                          value={it.unit ?? ''}
                          onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                          placeholder="pz"
                          className="col-span-1 bg-transparent px-1 py-1 text-center text-xs font-light text-mute focus:outline-none"
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          value={it.unitPrice || ''}
                          step={0.01}
                          onChange={(e) => updateItem(it.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="col-span-2 bg-transparent px-2 py-1 text-right text-sm font-light text-bone focus:outline-none"
                        />
                        <span className="col-span-1 text-right text-sm font-light text-mute">
                          {money(subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          aria-label="Quitar"
                          className="col-span-1 inline-flex items-center justify-end text-mute-dark hover:text-amber"
                        >
                          <X size={14} strokeWidth={1.4} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <label className="mb-2 block text-[10px] font-light uppercase text-mute tracking-[0.3em]">
              Notas (opcional)
            </label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={2}
              placeholder="Variantes, observaciones, supuestos…"
              className="w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone placeholder:text-mute-dark focus:outline-none"
            />
          </div>
        </div>

        {/* ── Columna derecha: resumen + acciones ───────────────────── */}
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-6">
          <div className="rounded-sm border border-line/40 bg-ink-soft p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-light uppercase text-mute tracking-[0.3em]">
                Resumen
              </h2>
              <BarChart3 size={14} strokeWidth={1.2} className="text-mute-dark" />
            </div>

            <div className="mt-5 space-y-2.5">
              {COSTING_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between text-[12px] font-light">
                  <span className="text-mute">{CATEGORY_LABEL[cat]}</span>
                  <span className="text-bone">{money(totals.byCategory[cat])}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-line/40 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-light uppercase text-mute tracking-[0.2em]">Costo total</span>
                <span className="text-base font-light text-bone">{money(totals.cost)}</span>
              </div>
            </div>

            {/* Margen */}
            <div className="mt-5">
              <label className="mb-2 block text-[10px] font-light uppercase text-mute tracking-[0.3em]">
                Margen (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1000}
                  value={draft.marginPct}
                  onChange={(e) => setDraft((d) => ({ ...d, marginPct: parseFloat(e.target.value) || 0 }))}
                  className="w-24 rounded-sm border border-line/60 bg-ink px-3 py-2 text-right text-sm font-light text-bone focus:outline-none"
                />
                <span className="text-[11px] font-light text-mute-dark">
                  utilidad {money(totals.profit)}
                </span>
              </div>
            </div>

            {/* IVA */}
            <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-[11px] font-light text-mute hover:text-bone">
              <input
                type="checkbox"
                checked={draft.ivaIncluded}
                onChange={(e) => setDraft((d) => ({ ...d, ivaIncluded: e.target.checked }))}
                className="h-3.5 w-3.5 accent-amber"
              />
              Incluir IVA 16 %
            </label>

            {/* Stack bar de proporciones */}
            {totals.cost > 0 && (
              <div className="mt-6 flex h-2 w-full overflow-hidden rounded-sm bg-line/40">
                <div style={{ width: `${pct(totals.byCategory.materiales, totals.priceFinal)}%` }} className="bg-amber" />
                <div style={{ width: `${pct(totals.byCategory.mano_obra,  totals.priceFinal)}%` }} className="bg-walnut" />
                <div style={{ width: `${pct(totals.byCategory.logistica,  totals.priceFinal)}%` }} className="bg-mute" />
                <div style={{ width: `${pct(totals.profit,                totals.priceFinal)}%` }} className="bg-amber/40" />
              </div>
            )}

            <div className="mt-6 border-t border-line/40 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-light uppercase text-mute tracking-[0.3em]">
                  Precio venta {draft.ivaIncluded ? '(c/IVA)' : ''}
                </span>
                <span className="text-2xl font-light text-amber">
                  {money(totals.priceFinal)}
                </span>
              </div>
              {draft.ivaIncluded && (
                <p className="mt-1 text-right text-[10px] font-light text-mute-dark">
                  IVA: {money(totals.iva)}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-amber py-2.5 text-[11px] font-light uppercase text-ink tracking-[0.3em] transition-colors hover:bg-amber-soft disabled:opacity-50"
              >
                <Save size={12} strokeWidth={1.4} />
                {saving ? 'Guardando…' : draft.id ? 'Actualizar' : 'Guardar costeo'}
              </button>
              {draft.id && (
                <button
                  type="button"
                  onClick={onNew}
                  className="text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:text-bone"
                >
                  Empezar uno nuevo
                </button>
              )}
              {savedAt && (
                <p className="text-center text-[10px] font-light italic text-amber/70">
                  Guardado · {new Date(savedAt).toLocaleTimeString('es-MX')}
                </p>
              )}
            </div>
          </div>
        </aside>
      </section>

      {/* ── Costeos guardados ──────────────────────────────────────── */}
      <section className="mt-20 border-t border-line/40 pt-12">
        <h2 className="mb-6 text-[10px] font-light uppercase text-mute tracking-[0.3em]">
          Costeos guardados
        </h2>
        {costingsQ.isPending ? (
          <p className="text-[12px] font-light italic text-mute-dark">Cargando…</p>
        ) : costingsQ.isError ? (
          <p className="text-[12px] font-light italic text-amber">
            No se pudieron cargar los costeos.
          </p>
        ) : (costingsQ.data ?? []).length === 0 ? (
          <p className="text-[12px] font-light italic text-mute-dark">
            Aún no hay costeos. Crea uno y guárdalo para recuperarlo aquí.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-px bg-line/40 md:grid-cols-2 lg:grid-cols-3">
            {(costingsQ.data ?? []).map((c) => {
              const t = calcTotalsFor(c);
              return (
                <li key={c.id} className="bg-ink p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-light text-bone">{c.productName}</p>
                      <p className="mt-1 text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
                        {new Date(c.updatedAt).toLocaleDateString('es-MX')} · margen {c.marginPct}%
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      aria-label="Eliminar"
                      className="text-mute-dark hover:text-amber"
                    >
                      <Trash2 size={14} strokeWidth={1.3} />
                    </button>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-[10px] font-light uppercase text-mute tracking-[0.2em]">Costo</span>
                    <span className="text-[12px] font-light text-mute">{money(t.cost)}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[10px] font-light uppercase text-mute tracking-[0.2em]">Precio</span>
                    <span className="text-base font-light text-amber">{money(t.priceFinal)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoad(c)}
                    className="mt-4 w-full rounded-sm border border-line py-2 text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:border-amber hover:text-amber"
                  >
                    Cargar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

interface Totals {
  byCategory: Record<CostingCategory, number>;
  cost:       number;
  profit:     number;
  priceNoIva: number;
  iva:        number;
  priceFinal: number;
}

function calcTotals(d: DraftState): Totals {
  return calcTotalsRaw(d.items, d.marginPct, d.ivaIncluded);
}

function calcTotalsFor(c: Costing): Totals {
  return calcTotalsRaw(c.items, c.marginPct, c.ivaIncluded);
}

function calcTotalsRaw(
  items: CostingItem[],
  marginPct: number,
  ivaIncluded: boolean,
): Totals {
  const byCategory: Record<CostingCategory, number> = {
    materiales: 0,
    mano_obra:  0,
    logistica:  0,
  };
  for (const it of items) {
    byCategory[it.category] += it.qty * it.unitPrice;
  }
  const cost       = byCategory.materiales + byCategory.mano_obra + byCategory.logistica;
  const priceNoIva = cost * (1 + (marginPct || 0) / 100);
  const profit     = priceNoIva - cost;
  const iva        = ivaIncluded ? priceNoIva * IVA_RATE : 0;
  const priceFinal = priceNoIva + iva;
  return { byCategory, cost, profit, priceNoIva, iva, priceFinal };
}

function money(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '$0';
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}
