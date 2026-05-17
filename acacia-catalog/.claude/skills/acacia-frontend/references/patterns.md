# Patterns — Acacia Frontend

Templates listos para copiar/adaptar. Mantener la coherencia con estos shapes.

---

## 1. Componente Presentacional

Template estándar. Named export, props como interface, sin lógica de datos.

```tsx
// src/components/MyComponent.tsx
import type { ProductPublic } from '@/types/product';

interface Props {
  product: ProductPublic;
  variant?: 'default' | 'compact';
}

export function MyComponent({ product, variant = 'default' }: Props) {
  return (
    <article className="bg-ink-soft p-6">
      <h3
        className="text-base font-light text-bone"
        style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
      >
        {product.name}
      </h3>
      {variant === 'default' && (
        <p className="mt-2 text-sm font-light text-mute">
          {product.tagline}
        </p>
      )}
    </article>
  );
}
```

**Reglas:**
- Named export (no default)
- Props como `interface` (no `type`)
- Defaults inline en destructuring
- Sin imports relativos largos — usar `@/`

---

## 2. Componente con Animación (Framer Motion)

```tsx
import { motion } from 'framer-motion';

interface Props {
  index: number;
}

export function AnimatedItem({ index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay:    index * 0.05,
        ease:     [0.2, 0.8, 0.2, 1],
      }}
    >
      {/* contenido */}
    </motion.div>
  );
}
```

**Reglas:**
- Stagger entre items: `index * 0.05`
- Duración: 500ms (cards) / 800ms (hero)
- Ease: `[0.2, 0.8, 0.2, 1]` (slight ease-out)
- Distancia de entrada: `y: 12` (cards) o `y: 16` (hero)

---

## 3. API Client

Un archivo por dominio. Funciones puras, sin estado.

```typescript
// src/api/<dominio>.ts
import type { ApiResponse, XShape } from '@/types/<dominio>';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn('[api] VITE_API_URL no está definido — usando fallback');
}

export async function fetchX(params?: { filter?: string }): Promise<XShape> {
  const url = new URL(`${API_URL}/x`);
  if (params?.filter) url.searchParams.set('filter', params.filter);

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  }

  const body = (await res.json()) as ApiResponse<XShape>;

  if (!body.ok) {
    throw new Error(`${body.error.code}: ${body.error.message}`);
  }

  return body.data;
}
```

**Reglas:**
- Funciones devuelven `data` desempaquetado, no `ApiResponse`
- Errores se propagan con `throw new Error(...)` — TanStack Query los captura
- Querystrings con `URL` + `searchParams`, nunca template strings con `?`
- Headers: `Accept: 'application/json'` siempre

---

## 4. Hook con TanStack Query

Para data simple, llamar `useQuery` directo en la página.
Para data reusable o con lógica adicional, envolver en hook custom:

```typescript
// src/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/api/products';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn:  fetchProducts,
    staleTime: 1000 * 60 * 5,
  });
}
```

**Convenciones queryKey:**
- Lista: `['products']`
- Detalle: `['product', slug]`
- Filtrado: `['products', { family: 'Muebles TV' }]`
- Familia: `['family', name]`

---

## 5. Página con Estados

Toda página debe manejar los 4 estados explícitamente.

```tsx
// src/pages/MyPage.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchSomething } from '@/api/something';

export function MyPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['something'],
    queryFn:  fetchSomething,
  });

  return (
    <main className="mx-auto max-w-7xl px-6 md:px-10">
      {/* Loading */}
      {isPending && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-3 text-mute">
            <span className="block h-px w-8 bg-amber/60" />
            <span className="text-[11px] font-light uppercase tracking-[0.3em]">
              Cargando
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex min-h-[40vh] flex-col items-start justify-center gap-4">
          <p className="text-sm font-light text-mute">No se pudo cargar.</p>
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

      {/* Empty */}
      {data && Array.isArray(data) && data.length === 0 && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="max-w-md text-center text-sm font-light italic text-mute">
            Aún no hay nada por aquí.
          </p>
        </div>
      )}

      {/* Data */}
      {data && /* renderizado */}
    </main>
  );
}
```

---

## 6. WhatsApp CTA

```typescript
function whatsappUrl(product: ProductPublic): string {
  const msg = encodeURIComponent(
    product.whatsappMessage ||
      `Hola, me interesa el modelo ${product.name} (${product.ref}).`,
  );
  return `https://wa.me/${product.whatsappNumber}?text=${msg}`;
}

// Uso:
<a
  href={whatsappUrl(product)}
  target="_blank"
  rel="noopener noreferrer"
  className="..."
>
```

**Reglas:**
- Fallback de mensaje si `whatsappMessage` viene vacío
- `target="_blank"` siempre con `rel="noopener noreferrer"`
- Click target debe ser área grande (card entera, no solo botón)

---

## 7. Formateo de Precios

```typescript
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
```

**Reglas:**
- `null` price → "Cotización personalizada" (italic en mute)
- Sin decimales (muebles, no centavos)
- Locale `es-MX`, moneda del producto

---

## 8. Imagen con Fallback

```tsx
{product.coverImage ? (
  <img
    src={product.coverImage}
    alt={product.name}
    loading="lazy"
    className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.03]"
  />
) : (
  <div className="flex h-full w-full items-center justify-center text-mute-dark">
    <span className="text-xs font-light tracking-[0.08em]">
      Sin imagen
    </span>
  </div>
)}
```

**Reglas:**
- Contenedor con `aspect-[4/5]` para mantener ratio sin layout shift
- `loading="lazy"` excepto si está above the fold
- `alt` con el nombre del producto, no descripción larga
- Fallback minimal — nunca un icono ruidoso

---

## 9. Header / Footer Sticky Pattern

```tsx
<header className="sticky top-0 z-30 border-b border-line/60 bg-ink/85 backdrop-blur-sm">
  {/* ... */}
</header>
```

**Reglas:**
- `bg-ink/85 backdrop-blur-sm` para semi-transparencia "quiet"
- `z-30` para headers, `z-50` para modales (futuro)
- Borde inferior `border-line/60`

---

## 10. Iconos (Lucide)

```tsx
import { Instagram, MessageCircle, ChevronRight } from 'lucide-react';

<Instagram size={14} strokeWidth={1.2} />
```

**Reglas:**
- `strokeWidth={1.2}` — line-style, coherente con la marca
- Tamaños: `12` (inline tiny), `14` (default inline), `16` (botón), `20+` (decorativo)
- Solo iconos line-style — nunca filled
