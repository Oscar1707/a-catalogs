import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ProductPublic } from '@/types/product';

interface Props {
  product: ProductPublic;
  index:   number;
}

function formatPriceRange(product: ProductPublic): string {
  const prices = product.prices
    .map((p) => p.price)
    .filter((p): p is number => typeof p === 'number');

  if (prices.length === 0) return 'Cotización personalizada';

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const currency = product.prices[0]?.currency ?? 'MXN';

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', {
      style:                 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

export function ProductCard({ product, index }: Props) {
  // Fallback al id si el slug no está definido (no debería pasar).
  const target = `/catalogo/${product.slug || product.id.toLowerCase()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Link to={target} className="group block" aria-label={`Ver detalle de ${product.name}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-ink-soft">
          {product.coverImage ? (
            <img
              src={product.coverImage}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.03]"
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
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/85 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              className="text-base font-light text-bone"
              style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
            >
              {product.name}
            </h3>
            <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.15em]">
              {product.ref}
            </span>
          </div>

          {product.tagline && (
            <p className="text-sm font-light italic text-mute">
              {product.tagline}
            </p>
          )}

          <p
            className="pt-2 text-sm font-light text-bone/90"
            style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
          >
            {formatPriceRange(product)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
