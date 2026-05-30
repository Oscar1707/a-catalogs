// admin/src/pages/Finanzas.tsx
// Módulo de finanzas: registro de ingresos y egresos.
// Los movimientos se pueden vincular a una cotización (quoteReference).

import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownCircle, ArrowLeftCircle, ArrowRightCircle, ArrowUpCircle,
  ChevronLeft, ChevronRight, DollarSign, Plus, Trash2, X,
} from 'lucide-react';
import { listTransactions, upsertTransaction, deleteTransaction } from '@/api/finance';
import type { Transaction, TransactionType, TransactionCategory } from '@/types/finance';
import { INGRESO_CATEGORIES, EGRESO_CATEGORIES } from '@/types/finance';

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });

// ─── Helpers ────────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('es-MX', { month: 'long', year: 'numeric' });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseMonth(iso: string): { year: number; month: number } {
  const [year, month] = iso.slice(0, 7).split('-').map(Number);
  return { year, month };
}

// ─── Formulario vacío ───────────────────────────────────────────────────────

interface Draft {
  id:             string;
  type:           TransactionType;
  amount:         string;
  concept:        string;
  category:       TransactionCategory;
  date:           string;
  note:           string;
  quoteReference: string;
}

function emptyDraft(type: TransactionType = 'ingreso'): Draft {
  return {
    id:             newId(),
    type,
    amount:         '',
    concept:        '',
    category:       type === 'ingreso' ? 'Anticipo' : 'Materiales',
    date:           todayISO(),
    note:           '',
    quoteReference: '',
  };
}

// ─── Componente principal ───────────────────────────────────────────────────

export function Finanzas() {
  const qc       = useQueryClient();
  const location = useLocation();

  // Mes visualizado
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [draft,     setDraft]     = useState<Draft>(emptyDraft());

  // Pre-llenar modal si viene desde CotizacionDetail
  useEffect(() => {
    const st = location.state as Record<string, unknown> | null;
    if (st?.openModal) {
      const type = (st.type as TransactionType) ?? 'ingreso';
      setDraft({
        id:             newId(),
        type,
        amount:         String(st.amount ?? ''),
        concept:        String(st.concept ?? ''),
        category:       (st.category as TransactionCategory) ?? (type === 'ingreso' ? 'Anticipo' : 'Materiales'),
        date:           todayISO(),
        note:           '',
        quoteReference: String(st.quoteReference ?? ''),
      });
      setShowModal(true);
      // Limpiar state para evitar que se re-abra al navegar atrás
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: all = [], isPending } = useQuery({
    queryKey: ['admin', 'transactions'],
    queryFn:  listTransactions,
  });

  // Filtrar por mes seleccionado
  const transactions = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return all
      .filter((t) => t.date.startsWith(prefix))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [all, year, month]);

  // Estadísticas del mes
  const { ingresos, egresos, balance } = useMemo(() => {
    const ingresos = transactions.filter((t) => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
    const egresos  = transactions.filter((t) => t.type === 'egreso' ).reduce((s, t) => s + t.amount, 0);
    return { ingresos, egresos, balance: ingresos - egresos };
  }, [transactions]);

  const upsertMutation = useMutation({
    mutationFn: (tx: Transaction) => upsertTransaction(tx),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'transactions'] }),
  });

  // Navegación de mes
  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const openNew = (type: TransactionType = 'ingreso') => {
    setDraft(emptyDraft(type));
    setShowModal(true);
  };

  // Pre-llenar desde un quoteReference externo (para integración con Cotizaciones)
  // Se usa a través de location.state o query param — ver CotizacionDetail

  const handleSave = () => {
    if (!draft.concept.trim() || !draft.amount || !draft.date) return;
    const now = new Date().toISOString();
    const tx: Transaction = {
      id:              draft.id,
      type:            draft.type,
      amount:          parseFloat(draft.amount) || 0,
      concept:         draft.concept.trim(),
      category:        draft.category,
      date:            draft.date,
      note:            draft.note.trim() || undefined,
      quoteReference:  draft.quoteReference.trim() || undefined,
      createdAt:       now,
      updatedAt:       now,
    };
    upsertMutation.mutate(tx);

    // Ajustar mes visible al mes del movimiento registrado
    const { year: y, month: m } = parseMonth(draft.date);
    setYear(y);
    setMonth(m);
  };

  const updateDraftType = (type: TransactionType) => {
    setDraft((d) => ({
      ...d,
      type,
      category: type === 'ingreso' ? 'Anticipo' : 'Materiales',
    }));
  };

  const categories = draft.type === 'ingreso' ? INGRESO_CATEGORIES : EGRESO_CATEGORIES;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
      {/* ── Encabezado ─────────────────────────────────────────── */}
      <header className="mb-10 border-b border-line/40 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-light uppercase text-amber tracking-[0.3em]">
            <DollarSign size={12} strokeWidth={1.2} /> Finanzas
          </p>
          <h1 className="text-3xl font-light leading-[1.1] text-bone md:text-4xl">
            Ingresos y egresos
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-mute">
            Registra entradas y salidas de dinero. Vincula los pagos a sus
            cotizaciones correspondientes para tener trazabilidad completa.
          </p>
        </motion.div>
      </header>

      {/* ── Selector de mes ────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={prevMonth}
            className="text-mute-dark hover:text-bone transition-colors">
            <ChevronLeft size={18} strokeWidth={1.2} />
          </button>
          <span className="min-w-[160px] text-center text-sm font-light capitalize text-bone">
            {monthLabel(year, month)}
          </span>
          <button type="button" onClick={nextMonth}
            className="text-mute-dark hover:text-bone transition-colors">
            <ChevronRight size={18} strokeWidth={1.2} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => openNew('ingreso')}
          className="inline-flex items-center gap-2 rounded-sm border border-amber px-4 py-2 text-[10px] font-light uppercase text-amber tracking-[0.25em] hover:bg-amber hover:text-ink transition-colors"
        >
          <Plus size={12} strokeWidth={1.4} /> Movimiento
        </button>
      </div>

      {/* ── Stats del mes ──────────────────────────────────────── */}
      <div className="mb-10 grid grid-cols-3 gap-px bg-line/40">
        <StatCard
          label="Balance"
          value={fmt.format(balance)}
          color={balance >= 0 ? 'text-bone' : 'text-amber'}
          icon={balance >= 0 ? <ArrowUpCircle size={14} strokeWidth={1.2} /> : <ArrowDownCircle size={14} strokeWidth={1.2} />}
        />
        <StatCard
          label="Ingresos"
          value={fmt.format(ingresos)}
          color="text-emerald-400"
          icon={<ArrowUpCircle size={14} strokeWidth={1.2} />}
        />
        <StatCard
          label="Egresos"
          value={fmt.format(egresos)}
          color="text-amber"
          icon={<ArrowDownCircle size={14} strokeWidth={1.2} />}
        />
      </div>

      {/* ── Lista de movimientos ────────────────────────────────── */}
      {isPending ? (
        <p className="text-[11px] font-light text-mute-dark tracking-[0.2em]">Cargando…</p>
      ) : transactions.length === 0 ? (
        <div className="border border-line/40 bg-ink-soft px-6 py-10 text-center">
          <p className="text-sm font-light text-mute">
            Sin movimientos en {monthLabel(year, month)}.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={() => openNew('ingreso')}
              className="text-[10px] font-light uppercase text-amber tracking-[0.25em] hover:text-bone">
              + Ingreso
            </button>
            <span className="text-mute-dark">·</span>
            <button type="button" onClick={() => openNew('egreso')}
              className="text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:text-bone">
              + Egreso
            </button>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line/30">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex items-start justify-between gap-4 py-4">
              {/* Indicador de tipo */}
              <span className={`mt-0.5 shrink-0 ${tx.type === 'ingreso' ? 'text-emerald-400' : 'text-amber'}`}>
                {tx.type === 'ingreso'
                  ? <ArrowUpCircle size={16} strokeWidth={1.2} />
                  : <ArrowDownCircle size={16} strokeWidth={1.2} />}
              </span>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="text-sm font-light text-bone">{tx.concept}</span>
                  <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.15em]">
                    {tx.category}
                  </span>
                  {tx.quoteReference && (
                    <Link
                      to={`/cotizaciones/${tx.quoteReference}`}
                      className="text-[10px] font-light uppercase text-amber/80 tracking-[0.15em] hover:text-amber"
                    >
                      {tx.quoteReference}
                    </Link>
                  )}
                </div>
                {tx.note && (
                  <p className="mt-0.5 text-[11px] font-light italic text-mute-dark">{tx.note}</p>
                )}
                <p className="mt-0.5 text-[10px] font-light text-mute-dark">
                  {new Date(tx.date + 'T12:00:00').toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short',
                  })}
                </p>
              </div>

              {/* Monto + eliminar */}
              <div className="flex items-center gap-3">
                <span className={`text-sm font-light ${tx.type === 'ingreso' ? 'text-emerald-400' : 'text-amber'}`}>
                  {tx.type === 'egreso' ? '−' : '+'}{fmt.format(tx.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Eliminar "${tx.concept}"?`)) deleteMutation.mutate(tx.id);
                  }}
                  className="text-mute-dark hover:text-amber transition-colors"
                  aria-label="Eliminar movimiento"
                >
                  <Trash2 size={13} strokeWidth={1.3} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Modal nuevo movimiento ──────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-ink border border-line/60 p-6 shadow-2xl"
          >
            <button type="button" onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-mute-dark hover:text-bone">
              <X size={16} strokeWidth={1.3} />
            </button>

            <h2 className="mb-6 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
              Nuevo movimiento
            </h2>

            {/* Toggle ingreso / egreso */}
            <div className="mb-5 grid grid-cols-2 gap-px bg-line/40">
              {(['ingreso', 'egreso'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateDraftType(t)}
                  className={`py-2.5 text-[11px] font-light uppercase tracking-[0.2em] transition-colors ${
                    draft.type === t
                      ? t === 'ingreso' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber/10 text-amber'
                      : 'bg-ink-soft text-mute hover:text-bone'
                  }`}
                >
                  {t === 'ingreso'
                    ? <span className="inline-flex items-center gap-1.5"><ArrowLeftCircle size={11} /> Ingreso</span>
                    : <span className="inline-flex items-center gap-1.5"><ArrowRightCircle size={11} /> Egreso</span>}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {/* Monto */}
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-light uppercase text-mute tracking-[0.25em]">
                  Monto (MXN) *
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={draft.amount}
                  onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none"
                />
              </label>

              {/* Concepto */}
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-light uppercase text-mute tracking-[0.25em]">
                  Concepto *
                </span>
                <input
                  type="text"
                  value={draft.concept}
                  onChange={(e) => setDraft((d) => ({ ...d, concept: e.target.value }))}
                  placeholder="Pago anticipo closet / Madera MDF / …"
                  className="w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none"
                />
              </label>

              {/* Categoría */}
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-light uppercase text-mute tracking-[0.25em]">
                  Categoría
                </span>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as TransactionCategory }))}
                  className="w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone focus:border-amber/60 focus:outline-none"
                >
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              {/* Fecha */}
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-light uppercase text-mute tracking-[0.25em]">
                  Fecha *
                </span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                  className="w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone focus:border-amber/60 focus:outline-none"
                />
              </label>

              {/* Cotización vinculada */}
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-light uppercase text-mute tracking-[0.25em]">
                  Cotización (opcional)
                </span>
                <input
                  type="text"
                  value={draft.quoteReference}
                  onChange={(e) => setDraft((d) => ({ ...d, quoteReference: e.target.value.toUpperCase() }))}
                  placeholder="ACW-2026-0001"
                  className="w-full rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none"
                />
              </label>

              {/* Nota */}
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-light uppercase text-mute tracking-[0.25em]">
                  Nota
                </span>
                <textarea
                  rows={2}
                  value={draft.note}
                  onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                  placeholder="Detalles adicionales…"
                  className="w-full resize-none rounded-sm border border-line/60 bg-ink-soft px-3 py-2 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-line py-2.5 text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:text-bone transition-colors">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.concept.trim() || !draft.amount || !draft.date || upsertMutation.isPending}
                className="flex-1 border border-amber py-2.5 text-[10px] font-light uppercase text-amber tracking-[0.25em] hover:bg-amber hover:text-ink transition-colors disabled:opacity-40"
              >
                {upsertMutation.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
            {upsertMutation.isError && (
              <p className="mt-3 text-[11px] font-light text-amber-soft">
                {upsertMutation.error instanceof Error ? upsertMutation.error.message : 'Error al guardar.'}
              </p>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────

function StatCard({
  label, value, color, icon,
}: {
  label: string; value: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-ink p-5">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-light uppercase text-mute tracking-[0.25em]">
        {icon} {label}
      </p>
      <p className={`text-xl font-light ${color}`}>{value}</p>
    </div>
  );
}
