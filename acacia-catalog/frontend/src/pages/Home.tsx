import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Search } from 'lucide-react';
import { fetchProducts } from '@/api/products';
import { fetchQuoteStatus } from '@/api/quotes';
import { fetchSlides } from '@/api/slides';
import { Carousel } from '@/components/Carousel';
import { ProductCard } from '@/components/ProductCard';
import type { QuoteStatusResult } from '@/types/quote';

export function Home() {
  const { data } = useQuery({
    queryKey: ['products'],
    queryFn:  fetchProducts,
  });

  // Productos destacados: primeros 3 del primer family.
  // TODO Sprint 2: usar flag `featured: true` desde DynamoDB.
  const featured = data
    ? Object.values(data).flat().slice(0, 3)
    : [];

  return (
    <main className="mx-auto max-w-7xl px-6 md:px-10">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="border-b border-line/40 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          className="max-w-2xl"
        >
          <p className="mb-6 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
            Colección · Root &amp; Light
          </p>
          <h1
            className="text-4xl font-light leading-[1.1] text-bone md:text-6xl"
            style={{ letterSpacing: '-0.01em' }}
          >
            Mobiliario diseñado para
            <br />
            <span className="italic text-mute">la quietud.</span>
          </h1>
          <p className="mt-8 max-w-lg text-base font-light leading-relaxed text-mute">
            Nogal, acero matte y luz ámbar 2700K. Cada pieza está hecha a mano
            en México y pensada para habitar el silencio.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 border border-line px-5 py-3 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
            >
              Ver catálogo
              <ArrowUpRight size={14} strokeWidth={1.2} />
            </Link>
            <Link
              to="/cotizaciones"
              className="inline-flex items-center gap-2 px-5 py-3 text-[11px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone"
            >
              Cotizar proyecto
              <ArrowUpRight size={14} strokeWidth={1.2} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Carrusel ────────────────────────────────────── */}
      <CarouselSection />

      {/* ── Destacados ──────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="border-t border-line/40 py-20 md:py-28">
          <header className="mb-12 flex items-end justify-between md:mb-16">
            <div>
              <p className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
                Selección
              </p>
              <h2
                className="text-3xl font-light text-bone md:text-4xl"
                style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
              >
                Piezas destacadas
              </h2>
            </div>
            <Link
              to="/catalogo"
              className="hidden items-center gap-2 text-[11px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone md:inline-flex"
            >
              Ver todo
              <ArrowUpRight size={14} strokeWidth={1.2} />
            </Link>
          </header>
          <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Consultar mi pedido ─────────────────────────── */}
      <CheckOrderStatus />
    </main>
  );
}

/* ────────────────────────────────────────────────────────
 * Carrusel del Home — slides desde DynamoDB (PK: SLIDE#<id>).
 * Cache 30 min (alineado con el QueryClient global).
 * Tipos: product · service · promo.
 * ──────────────────────────────────────────────────────── */
function CarouselSection() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['slides'],
    queryFn:  fetchSlides,
  });

  // En loading / error / vacío no rompemos el flujo del Home — simplemente
  // mostramos un placeholder discreto o nada (graceful degradation).
  if (isPending) {
    return (
      <section className="border-t border-line/40 py-20 md:py-28">
        <div className="flex aspect-[16/7] items-center justify-center border border-line/40 bg-ink-soft">
          <span className="text-[11px] font-light uppercase text-mute tracking-[0.3em]">
            Cargando destacados
          </span>
        </div>
      </section>
    );
  }

  if (isError || !data || data.length === 0) return null;

  return (
    <section className="border-t border-line/40 py-20 md:py-28">
      <Carousel slides={data} />
    </section>
  );
}

/* ────────────────────────────────────────────────────────
 * Consulta de estatus de cotización.
 * Validación: número de referencia + teléfono registrado.
 * Conecta a GET /quotes/{reference}?phone=...
 * ──────────────────────────────────────────────────────── */
function CheckOrderStatus() {
  const [ref,   setRef]   = useState('');
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: ({ r, p }: { r: string; p: string }) => fetchQuoteStatus(r, p),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ r: ref.trim().toUpperCase(), p: phone });
  };

  return (
    <section className="border-t border-line/40 py-20 md:py-28">
      <header className="mb-10 max-w-2xl md:mb-14">
        <p className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
          Seguimiento
        </p>
        <h2
          className="text-3xl font-light text-bone md:text-4xl"
          style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
        >
          Consulta tu cotización
        </h2>
        <p className="mt-5 max-w-lg text-sm font-light leading-relaxed text-mute">
          Ingresa tu número de referencia y el teléfono que registraste para
          revisar el estatus de tu solicitud.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid max-w-xl grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <Field
          label="Referencia"
          placeholder="ACW-2026-0000"
          value={ref}
          onChange={setRef}
          required
        />
        <Field
          label="Teléfono"
          placeholder="55 1234 5678"
          value={phone}
          onChange={setPhone}
          type="tel"
          required
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center justify-center gap-2 border border-line px-5 py-3 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search size={14} strokeWidth={1.2} />
          {mutation.isPending ? 'Buscando…' : 'Consultar'}
        </button>
      </form>

      {/* ── Resultado / Error ──────────────────────────── */}
      {mutation.isSuccess && <StatusResult result={mutation.data} />}

      {mutation.isError && (
        <p className="mt-6 max-w-xl border border-line/60 bg-ink-soft px-4 py-3 text-sm font-light text-mute">
          No encontramos una cotización con esos datos. Verifica tu referencia
          y teléfono.
        </p>
      )}
    </section>
  );
}

function StatusResult({ result }: { result: QuoteStatusResult }) {
  const date = new Date(result.updatedAt);
  const formatted = date.toLocaleDateString('es-MX', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-8 max-w-xl border border-line bg-ink-soft p-6"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-line/40 pb-4">
        <p
          className="text-base font-light text-bone"
          style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
        >
          {result.reference}
        </p>
        <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
          {result.projectType}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
            Estatus
          </p>
          <p
            className="mt-2 text-lg font-light text-amber"
            style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
          >
            {result.status}
          </p>
        </div>
        <p className="text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
          Actualizado · {formatted}
        </p>
      </div>
    </motion.div>
  );
}

interface FieldProps {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  type?:        string;
  required?:    boolean;
}

function Field({
  label, value, onChange, placeholder, type = 'text', required,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none"
      />
    </label>
  );
}
