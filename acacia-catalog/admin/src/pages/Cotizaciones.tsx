// admin/src/pages/Cotizaciones.tsx
// Inbox de cotizaciones — listado filtrable + búsqueda local.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowUpRight, RefreshCw, Search } from 'lucide-react';
import { listQuotes } from '@/api/quotes';
import { StatusBadge } from '@/components/StatusBadge';
import { QUOTE_STATUSES, type QuoteStatus } from '@/types/quote';

type Filter = QuoteStatus | 'Todas';

const FILTERS: Filter[] = ['Todas', ...QUOTE_STATUSES];

export function Cotizaciones() {
  const [filter, setFilter] = useState<Filter>('Todas');
  const [query,  setQuery]  = useState('');

  // Cargar TODAS las cotizaciones siempre — filtrado en cliente.
  // Cache de 30s; refetch manual con el botón.
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'quotes'],
    queryFn:  () => listQuotes(),
  });

  // Búsqueda local: por referencia, nombre o teléfono
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (filter !== 'Todas' && row.status !== filter) return false;
      if (!q) return true;
      return (
        row.reference.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.phone.includes(q.replace(/\D+/g, ''))
      );
    });
  }, [data, filter, query]);

  // Contadores por status — calculados sobre el dataset completo (no filtrado)
  const counters = useMemo(() => {
    const out: Record<Filter, number> = {
      Todas: data?.length ?? 0,
      'Abierta':                  0,
      'En revisión':              0,
      'Propuesta enviada':        0,
      'Finalizada · Aceptada':    0,
      'Finalizada · Rechazada':   0,
      'Finalizada · Expirada':    0,
    };
    data?.forEach((q) => { out[q.status] = (out[q.status] ?? 0) + 1; });
    return out;
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl px-6 md:px-10">
      {/* ── Header ─────────────────────────────────────── */}
      <section className="border-b border-line/40 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-3 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
            Inbox
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1
              className="text-3xl font-light leading-[1.1] text-bone md:text-4xl"
              style={{ letterSpacing: '-0.005em' }}
            >
              Cotizaciones
            </h1>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 border border-line px-4 py-2 text-[10px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone hover:bg-ink-soft disabled:opacity-40"
            >
              <RefreshCw size={12} strokeWidth={1.2} className={isFetching ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Filtros por status ─────────────────────────── */}
      <section className="flex flex-wrap items-center gap-2 border-b border-line/40 py-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`inline-flex items-center gap-2 border px-3 py-2 text-[10px] font-light uppercase tracking-[0.2em] transition-colors ${
              filter === f
                ? 'border-amber/60 text-bone'
                : 'border-line text-mute hover:border-line/80 hover:text-bone'
            }`}
          >
            {f}
            <span className="text-mute-dark">{counters[f]}</span>
          </button>
        ))}
      </section>

      {/* ── Búsqueda ───────────────────────────────────── */}
      <section className="border-b border-line/40 py-5">
        <label className="flex items-center gap-3">
          <Search size={14} strokeWidth={1.2} className="text-mute-dark" />
          <input
            type="text"
            placeholder="Buscar por referencia, nombre o teléfono…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-light text-bone placeholder:text-mute-dark focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[10px] font-light uppercase text-mute tracking-[0.2em] hover:text-bone"
            >
              Limpiar
            </button>
          )}
        </label>
      </section>

      {/* ── Estados ────────────────────────────────────── */}
      {isPending && (
        <div className="flex min-h-[40vh] items-center justify-center text-mute">
          <span className="text-[11px] font-light uppercase tracking-[0.3em]">
            Cargando cotizaciones
          </span>
        </div>
      )}

      {isError && (
        <div className="flex min-h-[30vh] flex-col items-start justify-center gap-4 py-12">
          <p className="text-sm font-light text-mute">
            No se pudieron cargar las cotizaciones.
          </p>
          <p className="text-xs font-light text-mute-dark">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
          <button
            onClick={() => refetch()}
            className="border border-line px-5 py-2 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
          >
            Reintentar
          </button>
        </div>
      )}

      {data && filtered.length === 0 && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="max-w-md text-center text-sm font-light italic text-mute">
            {data.length === 0
              ? 'Sin cotizaciones todavía. Cuando un cliente envíe el formulario aparecerá aquí.'
              : 'Ninguna cotización coincide con los filtros actuales.'}
          </p>
        </div>
      )}

      {/* ── Tabla / lista ──────────────────────────────── */}
      {data && filtered.length > 0 && (
        <>
          {/* Tabla en desktop */}
          <section className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line/40 text-left">
                  <Th>Referencia</Th>
                  <Th>Cliente</Th>
                  <Th>Tipo</Th>
                  <Th>Status</Th>
                  <Th>Recibida</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, i) => (
                  <motion.tr
                    key={q.reference}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.2) }}
                    className="border-b border-line/40 transition-colors hover:bg-ink-soft"
                  >
                    <Td>
                      <Link
                        to={`/cotizaciones/${q.reference}`}
                        className="text-bone hover:text-amber"
                        style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
                      >
                        {q.reference}
                      </Link>
                    </Td>
                    <Td>
                      <div className="text-bone">{q.name}</div>
                      <div className="mt-1 text-[10px] uppercase text-mute-dark tracking-[0.15em]">
                        {formatPhone(q.phone)}
                      </div>
                    </Td>
                    <Td className="text-mute">{q.projectType}</Td>
                    <Td><StatusBadge status={q.status} size="sm" /></Td>
                    <Td className="text-mute-dark">{formatDate(q.createdAt)}</Td>
                    <Td className="text-right">
                      <Link
                        to={`/cotizaciones/${q.reference}`}
                        className="inline-flex items-center gap-1 text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:text-bone"
                        aria-label={`Abrir ${q.reference}`}
                      >
                        Abrir
                        <ArrowUpRight size={12} strokeWidth={1.2} />
                      </Link>
                    </Td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Cards en mobile */}
          <section className="md:hidden">
            <ul className="divide-y divide-line/40">
              {filtered.map((q) => (
                <li key={q.reference}>
                  <Link
                    to={`/cotizaciones/${q.reference}`}
                    className="block py-5 transition-colors hover:bg-ink-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="text-sm font-light text-bone"
                          style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
                        >
                          {q.reference}
                        </p>
                        <p className="mt-1 truncate text-sm font-light text-mute">
                          {q.name} · {formatPhone(q.phone)}
                        </p>
                        <p className="mt-1 truncate text-xs font-light italic text-mute-dark">
                          {q.projectType}
                        </p>
                      </div>
                      <StatusBadge status={q.status} size="sm" />
                    </div>
                    <p className="mt-3 text-[10px] uppercase text-mute-dark tracking-[0.2em]">
                      {formatDate(q.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="py-10" />
    </div>
  );
}

/* ─── Helpers ─── */

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="py-4 pr-6 text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`py-4 pr-6 text-sm font-light ${className}`}>{children}</td>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    });
  } catch {
    return iso;
  }
}

function formatPhone(phone: string): string {
  // Formato simple MX: 52 55 1234 5678
  const d = phone.replace(/\D+/g, '');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3');
  if (d.length === 12) return d.replace(/(\d{2})(\d{2})(\d{4})(\d{4})/, '$1 $2 $3 $4');
  return phone;
}
