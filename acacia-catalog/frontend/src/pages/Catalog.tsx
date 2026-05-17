import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { fetchProducts } from '@/api/products';
import { FamilySection } from '@/components/FamilySection';
import { Finishes } from '@/components/Finishes';

export function Catalog() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn:  fetchProducts,
  });

  // Filtro por familia — frontend-only, sin llamadas extra a la API.
  const [familyFilter, setFamilyFilter] = useState<string>('');

  const families = useMemo(
    () => (data ? Object.keys(data) : []),
    [data],
  );

  const filtered = useMemo(() => {
    if (!data) return {};
    if (!familyFilter) return data;
    return { [familyFilter]: data[familyFilter] ?? [] };
  }, [data, familyFilter]);

  return (
    <main className="mx-auto max-w-7xl px-6 md:px-10">
      {/* ── Header de página ────────────────────────────── */}
      <section className="border-b border-line/40 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
            Catálogo
          </p>
          <h1
            className="text-4xl font-light leading-[1.1] text-bone md:text-5xl"
            style={{ letterSpacing: '-0.005em' }}
          >
            Todas las piezas
          </h1>
          <p className="mt-6 max-w-lg text-sm font-light leading-relaxed text-mute">
            Diseños de autor en producción continua. Cada pieza puede ajustarse
            en medidas y acabado bajo cotización.
          </p>
        </motion.div>
      </section>

      {/* ── Filtros ─────────────────────────────────────── */}
      {families.length > 0 && (
        <section className="flex flex-wrap items-center gap-3 border-b border-line/40 py-6">
          <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
            Familia ·
          </span>
          <FilterChip
            label="Todas"
            active={!familyFilter}
            onClick={() => setFamilyFilter('')}
          />
          {families.map((f) => (
            <FilterChip
              key={f}
              label={f}
              active={familyFilter === f}
              onClick={() => setFamilyFilter(f)}
            />
          ))}
        </section>
      )}

      {/* ── Estados ─────────────────────────────────────── */}
      {isPending && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-3 text-mute">
            <span className="block h-px w-8 bg-amber/60" />
            <span className="text-[11px] font-light uppercase tracking-[0.3em]">
              Cargando catálogo
            </span>
          </div>
        </div>
      )}

      {isError && (
        <div className="flex min-h-[40vh] flex-col items-start justify-center gap-4">
          <p className="text-sm font-light text-mute">
            No se pudo cargar el catálogo.
          </p>
          <p className="text-xs font-light text-mute-dark">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
          <button
            onClick={() => refetch()}
            className="border border-line px-5 py-2 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
          >
            Reintentar
          </button>
        </div>
      )}

      {data && Object.keys(filtered).length === 0 && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="max-w-md text-center text-sm font-light italic text-mute">
            No hay piezas en esta familia todavía.
          </p>
        </div>
      )}

      {/* ── Grid de productos ───────────────────────────── */}
      {data &&
        Object.entries(filtered).map(([family, products]) => (
          <FamilySection key={family} family={family} products={products} />
        ))}

      {/* ── Acabados ────────────────────────────────────── */}
      <Finishes />
    </main>
  );
}

interface ChipProps {
  label:   string;
  active:  boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-4 py-2 text-[10px] font-light uppercase tracking-[0.2em] transition-colors ${
        active
          ? 'border-amber/60 text-bone'
          : 'border-line text-mute hover:border-line/80 hover:text-bone'
      }`}
    >
      {label}
    </button>
  );
}
