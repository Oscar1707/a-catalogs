import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { fetchProducts } from '@/api/products';
import type { PriceEntry, ProductPublic } from '@/types/product';

export function ProductDetail() {
  const { slug = '' } = useParams<{ slug: string }>();

  // Reutilizamos el mismo queryKey que la página del catálogo —
  // TanStack Query devuelve el cache si está fresco (30 min staleTime).
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn:  fetchProducts,
  });

  // Buscar el producto por slug en todos los grupos (case-insensitive).
  const product = useMemo<ProductPublic | undefined>(() => {
    if (!data) return undefined;
    const target = slug.toLowerCase();
    for (const list of Object.values(data)) {
      const hit = list.find((p) => p.slug?.toLowerCase() === target);
      if (hit) return hit;
    }
    return undefined;
  }, [data, slug]);

  // ── Estado: cargando ──
  if (isPending) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 md:px-10">
        <div className="flex items-center gap-3 text-mute">
          <span className="block h-px w-8 bg-amber/60" />
          <span className="text-[11px] font-light uppercase tracking-[0.3em]">
            Cargando pieza
          </span>
        </div>
      </main>
    );
  }

  // ── Estado: error ──
  if (isError) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <p className="text-sm font-light text-mute">No se pudo cargar la pieza.</p>
        <p className="mt-2 text-xs font-light text-mute-dark">
          {error instanceof Error ? error.message : 'Error desconocido'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-6 border border-line px-5 py-2 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
        >
          Reintentar
        </button>
      </main>
    );
  }

  // ── Estado: producto no encontrado ──
  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 md:px-10 md:py-32">
        <p className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
          404
        </p>
        <h1
          className="text-3xl font-light leading-[1.15] text-bone md:text-4xl"
          style={{ letterSpacing: '-0.005em' }}
        >
          Esta pieza no existe
        </h1>
        <p className="mt-6 max-w-lg text-sm font-light leading-relaxed text-mute">
          La referencia que buscas no está en nuestro catálogo. Quizá fue
          archivada o el enlace está incompleto.
        </p>
        <Link
          to="/catalogo"
          className="mt-10 inline-flex items-center gap-2 border border-line px-5 py-3 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
        >
          <ArrowLeft size={14} strokeWidth={1.2} />
          Volver al catálogo
        </Link>
      </main>
    );
  }

  return <ProductView product={product} />;
}

/* ────────────────────────────────────────────────────────
 * Vista principal del detalle. Layout 2 columnas en desktop,
 * stack en mobile. Galería a la izquierda, info a la derecha.
 * ──────────────────────────────────────────────────────── */
function ProductView({ product }: { product: ProductPublic }) {
  return (
    <main className="mx-auto max-w-7xl px-6 md:px-10">
      {/* ── Breadcrumb / volver ────────────────────────── */}
      <nav className="py-6 md:py-8" aria-label="Breadcrumb">
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 text-[10px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone"
        >
          <ArrowLeft size={12} strokeWidth={1.2} />
          Catálogo
        </Link>
      </nav>

      {/* ── Hero del producto: galería + info ──────────── */}
      <section className="grid grid-cols-1 gap-x-16 gap-y-10 pb-16 md:grid-cols-[1.1fr_1fr] md:pb-24">
        <Gallery product={product} />
        <Info       product={product} />
      </section>

      {/* ── Specs por talla ────────────────────────────── */}
      {Object.keys(product.tallas ?? {}).length > 0 && (
        <SpecsByTalla product={product} />
      )}

      {/* ── Material / Acabado / Iluminación ───────────── */}
      <Materials product={product} />
    </main>
  );
}

/* ─── Galería ─── */
function Gallery({ product }: { product: ProductPublic }) {
  const images = product.images?.length
    ? product.images
    : product.coverImage
      ? [product.coverImage]
      : [];

  const [active, setActive] = useState(0);
  const main = images[active];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="aspect-[4/5] overflow-hidden bg-ink-soft">
        {main ? (
          <img
            src={main}
            alt={product.name}
            loading="eager"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-mute-dark">
            <span
              className="text-xs font-light"
              style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
            >
              Sin imagen
            </span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-5">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Imagen ${i + 1} de ${images.length}`}
              aria-current={i === active}
              className={`aspect-[4/5] overflow-hidden border transition-colors ${
                i === active ? 'border-amber/60' : 'border-line hover:border-mute'
              }`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Info / CTA ─── */
function Info({ product }: { product: ProductPublic }) {
  const waUrl = `https://wa.me/${product.whatsappNumber}?text=${encodeURIComponent(
    product.whatsappMessage ||
      `Hola, me interesa el modelo ${product.name} (${product.ref}).`,
  )}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <p className="mb-4 text-[10px] font-light uppercase text-amber tracking-[0.3em]">
        {product.linea || product.categoria}
      </p>
      <h1
        className="text-4xl font-light leading-[1.05] text-bone md:text-5xl"
        style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
      >
        {product.name}
      </h1>
      <p className="mt-3 text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
        Ref · {product.ref}
      </p>

      {product.tagline && (
        <p className="mt-6 text-base font-light italic leading-relaxed text-mute">
          {product.tagline}
        </p>
      )}

      {product.description && (
        <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-mute">
          {product.description}
        </p>
      )}

      {/* Precio destacado */}
      {product.prices?.length > 0 && (
        <p
          className="mt-8 text-2xl font-light text-bone"
          style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
        >
          {formatPriceRange(product.prices)}
        </p>
      )}

      {/* CTA WhatsApp */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 inline-flex items-center gap-3 border border-amber/60 bg-ink-soft px-6 py-4 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink"
      >
        <MessageCircle size={16} strokeWidth={1.2} />
        Cotizar por WhatsApp
      </a>

      <p className="mt-4 max-w-md text-[11px] font-light italic text-mute-dark">
        Cada pieza puede ajustarse en medidas y acabado.
      </p>
    </motion.div>
  );
}

/* ─── Specs por talla ─── */
function SpecsByTalla({ product }: { product: ProductPublic }) {
  const sizes = Object.entries(product.tallas);

  return (
    <section className="border-t border-line/40 py-16 md:py-20">
      <p className="mb-8 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
        Tallas
      </p>
      <ul className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
        {sizes.map(([size, info]) => {
          const matchingPrice = product.prices.find((p) =>
            p.label.toLowerCase().includes(size.toLowerCase()),
          );
          return (
            <li key={size} className="border-t border-line/40 pt-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3
                  className="text-base font-light text-bone"
                  style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
                >
                  {size}
                </h3>
                {info.esBase && (
                  <span className="text-[10px] font-light uppercase text-amber tracking-[0.2em]">
                    Base
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-light text-mute">
                {info.dimensiones}
              </p>
              {matchingPrice && (
                <p className="mt-3 text-sm font-light text-bone/90">
                  {formatSinglePrice(matchingPrice)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─── Material / Acabado / etc. ─── */
function Materials({ product }: { product: ProductPublic }) {
  const rows = [
    { label: 'Material', value: product.materialPrincipal },
    { label: 'Acabado',     value: product.acabado     },
    { label: 'Iluminación', value: product.iluminacion },
    { label: 'Instalación', value: product.instalacion },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;

  return (
    <section className="border-t border-line/40 py-16 md:py-20">
      <p className="mb-8 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
        Materia
      </p>
      <dl className="grid grid-cols-1 gap-y-5 md:grid-cols-[200px_1fr] md:gap-y-6">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
              {r.label}
            </dt>
            <dd className="text-sm font-light leading-relaxed text-mute">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ─── Helpers de precio ─── */
function formatPriceRange(prices: PriceEntry[]): string {
  const nums = prices
    .map((p) => p.price)
    .filter((p): p is number => typeof p === 'number');

  if (nums.length === 0) return 'Cotización personalizada';

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const currency = prices[0]?.currency ?? 'MXN';

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', {
      style:                 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

function formatSinglePrice(p: PriceEntry): string {
  if (p.price == null) return 'Cotización';
  return new Intl.NumberFormat('es-MX', {
    style:                 'currency',
    currency:              p.currency,
    maximumFractionDigits: 0,
  }).format(p.price);
}
