import type { ProductPublic } from '@/types/product';
import { ProductCard } from './ProductCard';

interface Props {
  family:   string;
  products: ProductPublic[];
}

export function FamilySection({ family, products }: Props) {
  const sorted = [...products].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );

  return (
    <section className="border-t border-line/40 py-16 first:border-t-0 md:py-24">
      <header className="mb-10 flex items-end justify-between md:mb-14">
        <h2
          className="text-2xl font-light text-bone md:text-3xl"
          style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
        >
          {family}
        </h2>
        <span className="text-[11px] font-light uppercase text-mute-dark tracking-[0.2em]">
          {sorted.length} {sorted.length === 1 ? 'pieza' : 'piezas'}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}
