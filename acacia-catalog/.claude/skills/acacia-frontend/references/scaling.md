# Scaling — Acacia Frontend

Cómo crecer el SPA sin romper la coherencia. Patrones para features futuros.

---

## Agregar React Router

Cuando se necesite la primera ruta adicional (típicamente `/producto/:slug`):

### 1. Instalar (ya está en package.json)
```bash
npm install react-router-dom
```

### 2. Refactorizar `App.tsx`
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Catalog } from '@/pages/Catalog';
import { ProductDetail } from '@/pages/ProductDetail';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex min-h-full flex-col bg-ink">
          <Header />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Catalog />} />
              <Route path="/producto/:slug" element={<ProductDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

### 3. Verificar fallback en CloudFront
Ya está configurado: 403/404 → `/index.html` con status 200.
El client-side router maneja el resto.

### 4. Links internos
Usar `<Link>` de `react-router-dom`, no `<a>`:
```tsx
import { Link } from 'react-router-dom';

<Link to={`/producto/${product.slug}`} className="...">
```

`<a>` se reserva para links externos (WhatsApp, Instagram).

---

## Agregar Vista de Detalle

`/producto/:slug` — vista del producto individual.

### Endpoint requerido
Backend debe exponer `GET /products/:slug` (ver `acacia-backend`).

### Estructura sugerida
```
pages/ProductDetail.tsx
├── Hero: imagen principal + nombre + tagline
├── Galería: thumbnails (Lightbox al click)
├── Specs: tabla con material, dimensiones, acabado
├── Tallas: selector con precios dinámicos
├── Descripción larga
└── WhatsApp CTA fijo (mobile) / inline (desktop)
```

### Patrón de fetch
```typescript
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const { slug } = useParams<{ slug: string }>();
const { data, isPending, isError } = useQuery({
  queryKey: ['product', slug],
  queryFn:  () => fetchProductBySlug(slug!),
  enabled:  !!slug,
});
```

---

## Filtros / Búsqueda

### Filtro client-side (recomendado para <500 productos)
1. `useQuery(['products'])` trae todo
2. `useMemo` para aplicar filtros locales
3. Estado en URL search params:
   ```tsx
   const [searchParams, setSearchParams] = useSearchParams();
   const family = searchParams.get('family');
   ```

**Ventajas:** instantáneo, sin requests adicionales, shareable URLs.

### Filtro server-side (cuando crezca)
1. Endpoint `GET /products?family=X&material=Y`
2. `useQuery(['products', { family, material }])` con la key incluyendo params
3. TanStack Query cachea cada combinación

---

## Formularios

**Recomendación:** evitar formularios cuando se pueda — el catálogo es read-only y CTA es WhatsApp.

Si se necesita un formulario (newsletter, contacto):

### Stack mínimo
- `react-hook-form` para estado y validación
- Sin librería de UI — inputs nativos con Tailwind
- Validación con HTML5 + custom messages

### Patrón básico
```tsx
import { useForm } from 'react-hook-form';

interface FormData {
  email: string;
  message: string;
}

export function ContactForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    // POST a un endpoint del backend
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input
        type="email"
        {...register('email', { required: true })}
        className="w-full border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone outline-none focus:border-amber/60"
      />
      {/* ... */}
    </form>
  );
}
```

### Reglas
- Inputs siempre `font-light`, `border-line`, focus `amber/60`
- Botón submit con `tracking-[0.25em]` uppercase
- Estado loading: deshabilitar + cambiar texto, sin spinner ruidoso
- Errors inline, en `text-amber` (no rojo, no rompe la paleta)

---

## Modal / Lightbox

Cuando se necesite (galería de imágenes, confirmación):

### Sin librería externa
- Framer Motion para animación de entrada/salida
- `AnimatePresence` para unmount limpio
- Focus trap manual con `useEffect`
- ESC para cerrar
- Click en backdrop para cerrar
- `role="dialog"` y `aria-modal="true"`

### Estructura
```tsx
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-3xl bg-ink-soft p-8"
      >
        {/* contenido */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

---

## Estado Global

Si se necesita estado UI compartido entre componentes lejanos (cart, theme, language):

1. **Primero intentar:** prop drilling — son 2-3 niveles máximo en esta SPA
2. **Si prop drilling es feo:** `useContext` (sin librería)
3. **Solo si crece mucho:** Zustand (no Redux — overkill)

**Nunca** mezclar estado server (TanStack Query) con estado UI. Son responsabilidades distintas.

---

## Auth Client-Side (Futuro)

Cuando se necesite área admin para cargar productos desde el SPA en vez de CLI:

### Stack mínimo
- AWS Cognito Hosted UI (no Amplify completo, demasiado pesado)
- `oidc-client-ts` para flow PKCE
- Token guardado en memory (no localStorage) — más seguro
- TanStack Query con `headers: { Authorization: 'Bearer ...' }` interceptado en el client

### No instalar
- Amplify (pesado, opinionated, mete React Context global)
- Auth0 SDK (overkill para un user)
- NextAuth (es para Next.js)

---

## Performance — Cuándo Optimizar

Métricas a vigilar (DevTools → Lighthouse):
- LCP <2.5s
- CLS <0.1
- TBT <300ms
- Bundle initial <400KB gzipped

### Optimizaciones a aplicar (en este orden)
1. **Code splitting por ruta** — `React.lazy()` + `Suspense` para `ProductDetail`
2. **Image optimization** — convertir a AVIF + WebP, servir con `<picture>`
3. **Preload del hero image** — `<link rel="preload" as="image">` en `index.html`
4. **Reducir Framer Motion** — usar `transform` CSS para hovers, framer solo para entrances
5. **Prefetch del query** — `queryClient.prefetchQuery` en navegación a detalle

**No optimizar prematuramente.** El bundle actual (~300KB / 97KB gzipped) está perfecto para esta escala.

---

## Internacionalización (i18n)

Cuando se necesite inglés:

### Stack
- `react-i18next` + `i18next-browser-languagedetector`
- Archivos en `src/i18n/es.json` y `src/i18n/en.json`

### Reglas
- Slogan "designed for the quiet" **nunca** se traduce — es marca
- Wordmark "ACACIA" **nunca** se traduce
- Precios siempre en MXN, sin importar idioma — solo formato (es-MX vs en-MX)

---

## SEO

Por defecto el SPA no es SEO-friendly. Si se requiere:

1. **Pre-rendering simple:** `vite-plugin-prerender` para rutas conocidas
2. **SSR completo:** migrar a Next.js (decisión grande, no tomar a la ligera)
3. **Meta tags dinámicos:** `react-helmet-async` por ahora

### Mínimo viable hoy (en `index.html`)
- `<title>` específico
- `<meta name="description">`
- `<meta property="og:image">` con render del logo
- `<meta property="og:url">`
- `<link rel="canonical">`

---

## Coordinar con Otras Skills

Antes de implementar cualquiera de estos features:

| Feature | Skill que también se involucra |
|---|---|
| Vista detalle | `acacia-backend` (nuevo endpoint) |
| Filtros server-side | `acacia-backend` (params en endpoint) |
| Auth admin | `acacia-catalog-aws` (Cognito) + `acacia-backend` (autorizador) |
| Formulario de contacto | `acacia-backend` (Lambda nueva) + `acacia-catalog-aws` (SES) |
| Pre-rendering / SSR | Decisión arquitectónica grande — discutir antes de hacer |
| Newsletter | `acacia-catalog-aws` (SES) + posible servicio externo |
