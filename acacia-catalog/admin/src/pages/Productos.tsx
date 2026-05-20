// admin/src/pages/Productos.tsx
// Listado completo de productos con toggle rápido de activo / featured.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowUpRight, Plus, RefreshCw, Search, Star } from 'lucide-react';
import { listProducts, updateProduct } from '@/api/products';
import type { ProductPublic, ProductUpdateInput } from '@/types/product';

type Filter = 'todos' | 'activos' | 'inactivos' | 'destacados';

const FILTER_LABELS: Record<Filter, string> = {
  todos:       'Todos',
  activos:     'Activos',
  inactivos:   'Inactivos',
  destacados:  'Destacados',
};

export function Productos() {
  const [filter, setFilter] = useState<Filter>('todos');
  const [query,  setQuery]  = useState('');

  const qc = useQueryClient();

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn:  listProducts,
  });

  // Mutation que actualiza un campo y refresca el cache.
  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProductUpdateInput }) =>
      updateProduct(id, patch),
    // Optimistic — actualizamos el cache antes de la respuesta
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'products'] });
      const previous = qc.getQueryData<ProductPublic[]>(['admin', 'products']);
      if (previous) {
        qc.setQueryData<ProductPublic[]>(
          ['admin', 'products'],
          previous.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback si falla
      if (ctx?.previous) qc.setQueryData(['admin', 'products'], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((p) => {
      // Filtro de tipo
      if (filter === 'activos'    && !p.active)   return false;
      if (filter === 'inactivos'  && p.active)    return false;
      if (filter === 'destacados' && !p.featured) return false;
      // Búsqueda
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.ref.toLowerCase().includes(q)  ||
        p.family.toLowerCase().includes(q)
      );
    });
  }, [data, filter, query]);

  const counters = useMemo(() => ({
    todos:       data?.length ?? 0,
    activos:     data?.filter((p) => p.active).length   ?? 0,
    inactivos:   data?.filter((p) => !p.active).length  ?? 0,
    destacados:  data?.filter((p) => p.featured).length ?? 0,
  }), [data]);

  const toggleActive = (p: ProductPublic) =>
    mutation.mutate({ id: p.id, patch: { active: !p.active } });

  const toggleFeatured = (p: ProductPublic) =>
    mutation.mutate({ id: p.id, patch: { featured: !p.featured } });

  return (
    <div className="mx-auto max-w-7xl px-6 md:px-10">
      <section className="border-b border-line/40 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-3 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
            Catálogo
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1
              className="text-3xl font-light leading-[1.1] text-bone md:text-4xl"
              style={{ letterSpacing: '-0.005em' }}
            >
              Productos
            </h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-2 border border-line px-4 py-2 text-[10px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone hover:bg-ink-soft disabled:opacity-40"
              >
                <RefreshCw size={12} strokeWidth={1.2} className={isFetching ? 'animate-spin' : ''} />
                Actualizar
              </button>
              <Link
                to="/productos/nuevo"
                className="inline-flex items-center gap-2 border border-amber/60 px-4 py-2 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
              >
                <Plus size={12} strokeWidth={1.2} />
                Nuevo
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Filtros */}
      <section className="flex flex-wrap items-center gap-2 border-b border-line/40 py-5">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
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
            {FILTER_LABELS[f]}
            <span className="text-mute-dark">{counters[f]}</span>
          </button>
        ))}
      </section>

      {/* Búsqueda */}
      <section className="border-b border-line/40 py-5">
        <label className="flex items-center gap-3">
          <Search size={14} strokeWidth={1.2} className="text-mute-dark" />
          <input
            type="text"
            placeholder="Buscar por nombre, referencia o familia…"
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

      {/* Estados */}
      {isPending && (
        <div className="flex min-h-[40vh] items-center justify-center text-mute">
          <span className="text-[11px] font-light uppercase tracking-[0.3em]">
            Cargando productos
          </span>
        </div>
      )}

      {isError && (
        <div className="flex min-h-[30vh] flex-col items-start justify-center gap-4 py-12">
          <p className="text-sm font-light text-mute">No se pudieron cargar.</p>
          <p className="text-xs font-light text-mute-dark">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
          <button
            onClick={() => refetch()}
            className="border border-line px-5 py-2 text-[10px] font-light uppercase text-bone tracking-[0.25em] hover:bg-ink-soft"
          >
            Reintentar
          </button>
        </div>
      )}

      {data && filtered.length === 0 && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-sm font-light italic text-mute">
            {data.length === 0
              ? 'Sin productos todavía.'
              : 'Ningún producto coincide con los filtros.'}
          </p>
        </div>
      )}

      {/* Lista */}
      {data && filtered.length > 0 && (
        <>
          {/* Tabla en desktop */}
          <section className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line/40 text-left">
                  <Th></Th>
                  <Th>Producto</Th>
                  <Th>Familia</Th>
                  <Th>Precio base</Th>
                  <Th>Activo</Th>
                  <Th>Destacado</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.2) }}
                    className="border-b border-line/40 transition-colors hover:bg-ink-soft"
                  >
                    <Td className="py-3">
                      <div className="h-14 w-14 overflow-hidden bg-ink-soft">
                        {p.coverImage ? (
                          <img
                            src={p.coverImage}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[8px] uppercase text-mute-dark tracking-[0.15em]">
                            S/img
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <Link
                        to={`/productos/${p.id}`}
                        className="text-bone hover:text-amber"
                        style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
                      >
                        {p.name}
                      </Link>
                      <div className="mt-1 text-[10px] uppercase text-mute-dark tracking-[0.15em]">
                        {p.ref}
                      </div>
                    </Td>
                    <Td className="text-mute">{p.family}</Td>
                    <Td className="text-mute">{formatPriceBase(p)}</Td>
                    <Td>
                      <ToggleButton
                        active={p.active}
                        onClick={() => toggleActive(p)}
                        label={p.active ? 'Activo' : 'Inactivo'}
                      />
                    </Td>
                    <Td>
                      <FeaturedButton
                        on={!!p.featured}
                        onClick={() => toggleFeatured(p)}
                      />
                    </Td>
                    <Td className="text-right">
                      <Link
                        to={`/productos/${p.id}`}
                        className="inline-flex items-center gap-1 text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:text-bone"
                      >
                        Editar
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
              {filtered.map((p) => (
                <li key={p.id} className="py-4">
                  <div className="flex gap-3">
                    <Link to={`/productos/${p.id}`} className="flex-shrink-0">
                      <div className="h-16 w-16 overflow-hidden bg-ink-soft">
                        {p.coverImage ? (
                          <img src={p.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[8px] uppercase text-mute-dark">S/img</div>
                        )}
                      </div>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/productos/${p.id}`}>
                        <p
                          className="truncate text-sm font-light text-bone"
                          style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
                        >
                          {p.name}
                        </p>
                        <p className="mt-1 text-[10px] uppercase text-mute-dark tracking-[0.15em]">
                          {p.ref} · {p.family}
                        </p>
                      </Link>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ToggleButton
                          active={p.active}
                          onClick={() => toggleActive(p)}
                          label={p.active ? 'Activo' : 'Inactivo'}
                          size="sm"
                        />
                        <FeaturedButton
                          on={!!p.featured}
                          onClick={() => toggleFeatured(p)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {mutation.isError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 border border-amber/60 bg-ink-soft px-4 py-2 text-[11px] font-light text-amber-soft tracking-[0.1em]">
          {mutation.error instanceof Error ? mutation.error.message : 'Error al actualizar'}
        </div>
      )}

      <div className="py-10" />
    </div>
  );
}

/* ─── Sub-componentes ─── */

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="py-3 pr-4 text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
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
  return <td className={`py-4 pr-4 text-sm font-light ${className}`}>{children}</td>;
}

interface ToggleProps {
  active:  boolean;
  onClick: () => void;
  label:   string;
  size?:   'sm' | 'md';
}

function ToggleButton({ active, onClick, label, size = 'md' }: ToggleProps) {
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border ${padding} text-[10px] font-light uppercase tracking-[0.2em] transition-colors ${
        active
          ? 'border-amber/60 text-bone bg-ink-soft'
          : 'border-line text-mute-dark hover:border-mute hover:text-mute'
      }`}
    >
      <span
        className={`block h-1.5 w-1.5 rounded-full ${active ? 'bg-amber' : 'bg-mute-dark'}`}
      />
      {label}
    </button>
  );
}

interface FeaturedProps {
  on:      boolean;
  onClick: () => void;
  size?:   'sm' | 'md';
}

function FeaturedButton({ on, onClick, size = 'md' }: FeaturedProps) {
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={on ? 'Quitar de destacados' : 'Marcar como destacado'}
      className={`inline-flex items-center gap-1.5 border ${padding} text-[10px] font-light uppercase tracking-[0.2em] transition-colors ${
        on
          ? 'border-amber/60 text-bone bg-ink-soft'
          : 'border-line text-mute-dark hover:border-mute hover:text-mute'
      }`}
    >
      <Star
        size={12}
        strokeWidth={1.2}
        fill={on ? 'currentColor' : 'none'}
        className={on ? 'text-amber' : 'text-mute-dark'}
      />
      {on ? 'Sí' : 'No'}
    </button>
  );
}

function formatPriceBase(p: ProductPublic): string {
  const nums = p.prices
    ?.map((pp) => pp.price)
    .filter((n): n is number => typeof n === 'number') ?? [];
  if (nums.length === 0) return 'Cotización';
  const min = Math.min(...nums);
  return new Intl.NumberFormat('es-MX', {
    style:                 'currency',
    currency:              p.prices[0]?.currency ?? 'MXN',
    maximumFractionDigits: 0,
  }).format(min);
}

