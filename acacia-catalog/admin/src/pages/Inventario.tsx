// admin/src/pages/Inventario.tsx
// Módulo de inventario: materiales e insumos con stock y movimientos.

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Box, ChevronDown, ChevronUp,
  Minus, Package, Pencil, Plus, Trash2, X,
} from 'lucide-react';
import {
  listInventory, upsertInventoryItem, deleteInventoryItem, addMovement, listMovements,
} from '@/api/inventory';
import type { InventoryItem, InventoryMovement, MovementType } from '@/types/inventory';
import { INVENTORY_CATEGORIES } from '@/types/inventory';

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const fmt    = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const fmtNum = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Draft de item ───────────────────────────────────────────────────────────

interface ItemDraft {
  id:       string;
  name:     string;
  category: InventoryItem['category'];
  quantity: string;
  unit:     string;
  unitCost: string;
  minStock: string;
  notes:    string;
}

function emptyItemDraft(): ItemDraft {
  return { id: newId(), name: '', category: 'Madera', quantity: '0', unit: 'pza', unitCost: '0', minStock: '0', notes: '' };
}

function itemToForm(item: InventoryItem): ItemDraft {
  return {
    id:       item.id,
    name:     item.name,
    category: item.category,
    quantity: String(item.quantity),
    unit:     item.unit,
    unitCost: String(item.unitCost),
    minStock: String(item.minStock),
    notes:    item.notes ?? '',
  };
}

// ─── Componente principal ────────────────────────────────────────────────────

export function Inventario() {
  const qc = useQueryClient();

  const [showItemModal, setShowItemModal]   = useState(false);
  const [editDraft,     setEditDraft]       = useState<ItemDraft>(emptyItemDraft());
  const [selectedId,    setSelectedId]      = useState<string | null>(null); // item expandido
  const [movDraft,      setMovDraft]        = useState<{ type: MovementType; qty: string; note: string; date: string } | null>(null);
  const [filterCat,     setFilterCat]       = useState<string>('');
  const [onlyLow,       setOnlyLow]         = useState(false);

  const { data: items = [], isPending } = useQuery({
    queryKey: ['admin', 'inventory'],
    queryFn:  listInventory,
  });

  const { data: movements = [] } = useQuery<InventoryMovement[]>({
    queryKey: ['admin', 'inventory', selectedId, 'movements'],
    queryFn:  () => listMovements(selectedId!),
    enabled:  !!selectedId,
  });

  const upsertMutation = useMutation({
    mutationFn: (item: InventoryItem) => upsertInventoryItem(item),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['admin', 'inventory'] });
      setShowItemModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['admin', 'inventory'] });
      if (selectedId) setSelectedId(null);
    },
  });

  const movMutation = useMutation({
    mutationFn: ({ itemId, type, quantity, note, date }: {
      itemId: string; type: MovementType; quantity: number; note?: string; date?: string;
    }) => addMovement(itemId, type, quantity, note, date),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'inventory'] });
      qc.invalidateQueries({ queryKey: ['admin', 'inventory', vars.itemId, 'movements'] });
      setMovDraft(null);
    },
  });

  // Estadísticas globales
  const { totalItems, lowStockItems, totalValue } = useMemo(() => ({
    totalItems:    items.length,
    lowStockItems: items.filter((i) => i.quantity <= i.minStock).length,
    totalValue:    items.reduce((s, i) => s + i.quantity * i.unitCost, 0),
  }), [items]);

  // Filtrado
  const filtered = useMemo(() => {
    let r = [...items];
    if (filterCat)  r = r.filter((i) => i.category === filterCat);
    if (onlyLow)    r = r.filter((i) => i.quantity <= i.minStock);
    return r;
  }, [items, filterCat, onlyLow]);

  const openNew = () => {
    setEditDraft(emptyItemDraft());
    setShowItemModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditDraft(itemToForm(item));
    setShowItemModal(true);
  };

  const handleSaveItem = () => {
    const d = editDraft;
    if (!d.name.trim() || !d.unit.trim()) return;
    const now = new Date().toISOString();
    const item: InventoryItem = {
      id:        d.id,
      name:      d.name.trim(),
      category:  d.category,
      quantity:  parseFloat(d.quantity) || 0,
      unit:      d.unit.trim(),
      unitCost:  parseFloat(d.unitCost) || 0,
      minStock:  parseFloat(d.minStock) || 0,
      notes:     d.notes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    upsertMutation.mutate(item);
  };

  const handleMovement = (itemId: string) => {
    if (!movDraft) return;
    const qty = parseFloat(movDraft.qty);
    if (!qty || qty <= 0) return;
    movMutation.mutate({
      itemId,
      type:     movDraft.type,
      quantity: qty,
      note:     movDraft.note.trim() || undefined,
      date:     movDraft.date || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
      {/* ── Encabezado ─────────────────────────────────────────── */}
      <header className="mb-10 border-b border-line/40 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-light uppercase text-amber tracking-[0.3em]">
            <Package size={12} strokeWidth={1.2} /> Inventario
          </p>
          <h1 className="text-3xl font-light leading-[1.1] text-bone md:text-4xl">
            Materiales e insumos
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-mute">
            Controla el stock de tus materiales. Registra entradas y salidas
            para saber siempre cuánto tienes disponible.
          </p>
        </motion.div>
      </header>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-3 gap-px bg-line/40">
        <div className="bg-ink p-5">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-light uppercase text-mute tracking-[0.25em]">
            <Box size={12} strokeWidth={1.2} /> Materiales
          </p>
          <p className="text-2xl font-light text-bone">{totalItems}</p>
        </div>
        <div className="bg-ink p-5">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-light uppercase text-mute tracking-[0.25em]">
            <AlertTriangle size={12} strokeWidth={1.2} /> Stock bajo
          </p>
          <p className={`text-2xl font-light ${lowStockItems > 0 ? 'text-amber' : 'text-bone'}`}>
            {lowStockItems}
          </p>
        </div>
        <div className="bg-ink p-5">
          <p className="mb-2 text-[10px] font-light uppercase text-mute tracking-[0.25em]">
            Valor total
          </p>
          <p className="text-2xl font-light text-bone">{fmt.format(totalValue)}</p>
        </div>
      </div>

      {/* ── Filtros + botón agregar ─────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-sm border border-line/60 bg-ink-soft px-3 py-1.5 text-[11px] font-light text-bone focus:outline-none"
          >
            <option value="">Todas las categorías</option>
            {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-light text-mute hover:text-bone">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(e) => setOnlyLow(e.target.checked)}
              className="accent-amber"
            />
            Solo stock bajo
          </label>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-sm border border-amber px-4 py-2 text-[10px] font-light uppercase text-amber tracking-[0.25em] hover:bg-amber hover:text-ink transition-colors"
        >
          <Plus size={12} strokeWidth={1.4} /> Agregar material
        </button>
      </div>

      {/* ── Lista de materiales ─────────────────────────────────── */}
      {isPending ? (
        <p className="text-[11px] font-light text-mute-dark tracking-[0.2em]">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-line/40 bg-ink-soft px-6 py-10 text-center">
          <p className="text-sm font-light text-mute">
            {items.length === 0
              ? 'Aún no tienes materiales. Agrega el primero.'
              : 'Ningún material coincide con el filtro.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line/30">
          {filtered.map((item) => {
            const isLow      = item.quantity <= item.minStock;
            const isExpanded = selectedId === item.id;
            const totalVal   = item.quantity * item.unitCost;

            return (
              <li key={item.id}>
                {/* Fila principal */}
                <div className="flex items-center gap-4 py-4">
                  {/* Expand toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(isExpanded ? null : item.id);
                      setMovDraft(null);
                    }}
                    className="shrink-0 text-mute-dark hover:text-bone transition-colors"
                  >
                    {isExpanded
                      ? <ChevronUp size={16} strokeWidth={1.2} />
                      : <ChevronDown size={16} strokeWidth={1.2} />}
                  </button>

                  {/* Nombre + categoría */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-light text-bone">{item.name}</span>
                      {isLow && (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-amber/10 px-2 py-0.5 text-[9px] font-light uppercase text-amber tracking-[0.15em]">
                          <AlertTriangle size={9} /> Stock bajo
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] font-light uppercase text-mute-dark tracking-[0.15em]">
                      {item.category}
                    </p>
                  </div>

                  {/* Stock */}
                  <div className="text-right">
                    <p className={`text-sm font-light ${isLow ? 'text-amber' : 'text-bone'}`}>
                      {fmtNum.format(item.quantity)} {item.unit}
                    </p>
                    <p className="text-[10px] font-light text-mute-dark">
                      mín {fmtNum.format(item.minStock)}
                    </p>
                  </div>

                  {/* Costo */}
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-light text-bone">{fmt.format(item.unitCost)}/{item.unit}</p>
                    <p className="text-[10px] font-light text-mute-dark">
                      total {fmt.format(totalVal)}
                    </p>
                  </div>

                  {/* Acciones rápidas */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Entrada"
                      onClick={() => {
                        setSelectedId(item.id);
                        setMovDraft({ type: 'entrada', qty: '', note: '', date: todayISO() });
                      }}
                      className="rounded-sm border border-line/60 p-1.5 text-mute hover:border-emerald-400/60 hover:text-emerald-400 transition-colors"
                    >
                      <Plus size={13} strokeWidth={1.4} />
                    </button>
                    <button
                      type="button"
                      title="Salida"
                      onClick={() => {
                        setSelectedId(item.id);
                        setMovDraft({ type: 'salida', qty: '', note: '', date: todayISO() });
                      }}
                      className="rounded-sm border border-line/60 p-1.5 text-mute hover:border-amber/60 hover:text-amber transition-colors"
                    >
                      <Minus size={13} strokeWidth={1.4} />
                    </button>
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => openEdit(item)}
                      className="text-mute hover:text-bone transition-colors"
                    >
                      <Pencil size={13} strokeWidth={1.3} />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${item.name}" y todos sus movimientos?`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      className="text-mute-dark hover:text-amber transition-colors"
                    >
                      <Trash2 size={13} strokeWidth={1.3} />
                    </button>
                  </div>
                </div>

                {/* Panel expandido: movimientos + formulario */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mb-4 ml-8 space-y-4 border-l border-line/40 pl-5">
                        {/* Form movimiento */}
                        {movDraft && (
                          <div className="rounded-sm border border-line/40 bg-ink-soft p-4">
                            <p className="mb-3 text-[10px] font-light uppercase text-mute tracking-[0.25em]">
                              {movDraft.type === 'entrada' ? '+ Entrada de stock' : '− Salida de stock'}
                            </p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <label className="block col-span-1">
                                <span className="mb-1 block text-[9px] font-light uppercase text-mute-dark tracking-[0.2em]">Cantidad</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  value={movDraft.qty}
                                  onChange={(e) => setMovDraft((d) => d && ({ ...d, qty: e.target.value }))}
                                  placeholder="0"
                                  className="w-full rounded-sm border border-line/60 bg-ink px-2 py-1.5 text-sm font-light text-bone focus:outline-none"
                                />
                              </label>
                              <label className="block col-span-1">
                                <span className="mb-1 block text-[9px] font-light uppercase text-mute-dark tracking-[0.2em]">Fecha</span>
                                <input
                                  type="date"
                                  value={movDraft.date}
                                  onChange={(e) => setMovDraft((d) => d && ({ ...d, date: e.target.value }))}
                                  className="w-full rounded-sm border border-line/60 bg-ink px-2 py-1.5 text-sm font-light text-bone focus:outline-none"
                                />
                              </label>
                              <label className="block col-span-2">
                                <span className="mb-1 block text-[9px] font-light uppercase text-mute-dark tracking-[0.2em]">Nota</span>
                                <input
                                  type="text"
                                  value={movDraft.note}
                                  onChange={(e) => setMovDraft((d) => d && ({ ...d, note: e.target.value }))}
                                  placeholder="Proveedor, proyecto, etc."
                                  className="w-full rounded-sm border border-line/60 bg-ink px-2 py-1.5 text-sm font-light text-bone placeholder:text-mute-dark focus:outline-none"
                                />
                              </label>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setMovDraft(null)}
                                className="border border-line px-3 py-1.5 text-[10px] font-light uppercase text-mute tracking-[0.2em] hover:text-bone transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMovement(item.id)}
                                disabled={!movDraft.qty || movMutation.isPending}
                                className={`border px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] transition-colors disabled:opacity-40 ${
                                  movDraft.type === 'entrada'
                                    ? 'border-emerald-400/60 text-emerald-400 hover:bg-emerald-400/10'
                                    : 'border-amber/60 text-amber hover:bg-amber/10'
                                }`}
                              >
                                {movMutation.isPending ? 'Guardando…' : 'Confirmar'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Historial de movimientos */}
                        <div>
                          <p className="mb-2 text-[9px] font-light uppercase text-mute-dark tracking-[0.2em]">
                            Historial
                          </p>
                          {movements.length === 0 ? (
                            <p className="text-[11px] font-light italic text-mute-dark">Sin movimientos aún.</p>
                          ) : (
                            <ul className="space-y-2">
                              {movements.slice(0, 20).map((m) => (
                                <li key={m.id} className="flex items-baseline gap-3 text-[11px] font-light">
                                  <span className={m.type === 'entrada' ? 'text-emerald-400' : 'text-amber'}>
                                    {m.type === 'entrada' ? '+' : '−'}{fmtNum.format(m.quantity)} {item.unit}
                                  </span>
                                  <span className="text-mute-dark">
                                    {new Date(m.date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                                  </span>
                                  {m.note && <span className="truncate text-mute">{m.note}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Modal editar / nuevo item ───────────────────────────── */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-ink border border-line/60 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button type="button" onClick={() => setShowItemModal(false)}
              className="absolute right-4 top-4 text-mute-dark hover:text-bone">
              <X size={16} strokeWidth={1.3} />
            </button>

            <h2 className="mb-6 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
              {items.some((i) => i.id === editDraft.id) ? 'Editar material' : 'Nuevo material'}
            </h2>

            <div className="space-y-4">
              <Field label="Nombre *">
                <input type="text" value={editDraft.name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="MDF 15mm, Bisagra de copa, Thinner…"
                  className={inputClass} />
              </Field>

              <Field label="Categoría">
                <select value={editDraft.category}
                  onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value as InventoryItem['category'] }))}
                  className={inputClass}>
                  {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cantidad inicial">
                  <input type="number" inputMode="decimal" step="0.01" value={editDraft.quantity}
                    onChange={(e) => setEditDraft((d) => ({ ...d, quantity: e.target.value }))}
                    className={inputClass} />
                </Field>
                <Field label="Unidad *">
                  <input type="text" value={editDraft.unit}
                    onChange={(e) => setEditDraft((d) => ({ ...d, unit: e.target.value }))}
                    placeholder="pza, m², kg, lt…"
                    className={inputClass} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Costo / unidad (MXN)">
                  <input type="number" inputMode="decimal" step="0.01" value={editDraft.unitCost}
                    onChange={(e) => setEditDraft((d) => ({ ...d, unitCost: e.target.value }))}
                    className={inputClass} />
                </Field>
                <Field label="Stock mínimo">
                  <input type="number" inputMode="decimal" step="0.01" value={editDraft.minStock}
                    onChange={(e) => setEditDraft((d) => ({ ...d, minStock: e.target.value }))}
                    placeholder="Alerta si baja de…"
                    className={inputClass} />
                </Field>
              </div>

              <Field label="Notas">
                <textarea rows={2} value={editDraft.notes}
                  onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="Proveedor, especificaciones, etc."
                  className={`${inputClass} resize-none`} />
              </Field>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowItemModal(false)}
                className="flex-1 border border-line py-2.5 text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:text-bone transition-colors">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={!editDraft.name.trim() || !editDraft.unit.trim() || upsertMutation.isPending}
                className="flex-1 border border-amber py-2.5 text-[10px] font-light uppercase text-amber tracking-[0.25em] hover:bg-amber hover:text-ink transition-colors disabled:opacity-40"
              >
                {upsertMutation.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────

const inputClass =
  'w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-light uppercase text-mute tracking-[0.25em]">
        {label}
      </span>
      {children}
    </label>
  );
}
