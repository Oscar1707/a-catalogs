---
name: acacia-frontend
description: >
  Skill de referencia para construir, extender y mantener el frontend del
  catálogo Acacia (Vite + React + TypeScript desplegado en S3 + CloudFront).
  Úsala siempre que el usuario mencione: agregar una página, crear un
  componente, modificar el catálogo, mostrar productos, conectar con un
  endpoint, cambiar estilos, ajustar tokens de marca, agregar una ruta,
  manejar estados de carga/error, optimizar imágenes, cambiar tipografía,
  o desplegar el SPA al bucket. También úsala cuando el usuario diga frases
  como "nueva página", "nuevo componente", "cambiar el hero", "agregar
  filtros", "modificar el card", "ajustar el color", "deploy del frontend",
  "build del SPA" o similares en el contexto del proyecto Acacia. Esta skill
  es OBLIGATORIA para todo trabajo en el frontend — nunca crees componentes,
  páginas o estilos de Acacia desde cero sin consultarla, ya que existen
  tokens y patrones definidos que deben respetarse para mantener la
  coherencia de marca.
---

# Acacia Frontend — Skill de Referencia

Catálogo público de muebles Acacia.
Stack: **Vite 5 · React 18 · TypeScript · Tailwind v4 · TanStack Query · Framer Motion**

Antes de cualquier tarea lee este archivo completo.
Para detalles específicos carga los archivos de referencia indicados en cada sección.

---

## Contexto del Proyecto

| Campo | Valor |
|---|---|
| Marca | Acacia — "designed for the quiet" |
| Tipo | SPA estático (Single Page App) |
| Audiencia | Compradores potenciales, redirección a WhatsApp |
| URL producción | https://d2pgrgppb9pktx.cloudfront.net |
| Hosting | S3 (`acacia-catalog-spa`) + CloudFront OAC (`E38C3UTB2ISSEA`) |
| API | https://y0uumgj0b4.execute-api.us-east-1.amazonaws.com/prod |
| Carpeta | `/Users/oscaracacio/Documents/ws/a-catalogs/acacia-catalog/frontend` |
| Puerto dev | 5175 (fijo, `strictPort: true`) |
| Idioma UI | Español (texto), inglés solo en el slogan/marca |
| Idioma código | TypeScript (comentarios en español) |

---

## Stack — Decisiones Fijas

| Capa | Tecnología | Por qué |
|---|---|---|
| Build | Vite 5 | Output estático ideal para S3, HMR rápido |
| Framework | React 18 + TypeScript | Tipos compartidos con backend, ecosistema |
| Routing | React Router 6 | Preparado para `/producto/:slug` futuro |
| Styling | Tailwind v4 (via `@tailwindcss/vite`) | Tokens custom, purge automático |
| Data | TanStack Query v5 | Cache, retry, estados loading/error |
| Animación | Framer Motion 11 | Stagger sutil — "the quiet" |
| Iconos | Lucide React | Minimal, line-style |
| Tipografía | Inter (Google Fonts) | Light weight, wide tracking |

**Reglas inquebrantables:**
- **Nunca** introducir librerías de UI como MUI, Chakra, Ant Design — rompen la identidad minimalista
- **Nunca** usar styled-components, emotion, ni CSS-in-JS — solo Tailwind + CSS modules si hace falta
- **Nunca** usar axios — `fetch` nativo es suficiente
- **Nunca** instalar Redux/Zustand para estado server — usar TanStack Query
- Estado UI puro: `useState` / `useReducer` — no necesitamos store global todavía

---

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── api/                # Clientes de API (uno por dominio)
│   │   └── products.ts
│   ├── components/         # Componentes presentacionales reutilizables
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   └── FamilySection.tsx
│   ├── pages/              # Rutas top-level (una por vista)
│   │   └── Catalog.tsx
│   ├── types/              # Tipos compartidos — mirror del backend
│   │   └── product.ts
│   ├── styles/
│   │   └── globals.css     # @import tailwindcss + @theme tokens
│   ├── App.tsx             # QueryClientProvider + layout
│   ├── main.tsx
│   └── vite-env.d.ts       # Tipos de import.meta.env
├── public/
│   └── favicon.svg
├── scripts/
│   └── deploy.sh           # build → S3 sync → CloudFront invalidate
├── .env.local              # VITE_API_URL (gitignored)
├── .env.example
├── vite.config.ts
├── tsconfig.app.json
├── tsconfig.node.json
└── package.json
```

**Regla:** una página = un archivo en `pages/`. Lógica reusable va en `components/`.
Los componentes deben ser puros — los efectos secundarios (fetching, mutations)
viven en `hooks/` o se importan directo desde TanStack Query en la página.

---

## Patrones Obligatorios

### 1. Fetching de datos — TanStack Query

Nunca usar `useEffect` para fetching. Siempre `useQuery` (o `useMutation`).

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/api/products';

const { data, isPending, isError, error, refetch } = useQuery({
  queryKey: ['products'],
  queryFn:  fetchProducts,
  staleTime: 1000 * 60 * 5,
});
```

`queryKey` debe ser un array — el primer elemento es el dominio (`products`,
`product`, `family`), los siguientes son los filtros/params.

### 2. API client — shape consistente

Cada archivo en `api/` exporta funciones puras que devuelven el `data` ya
desempaquetado del envelope `{ ok, data, meta }`. Ver `references/patterns.md`
para el template completo.

```typescript
export async function fetchX(): Promise<XShape> {
  const res = await fetch(`${API_URL}/x`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json() as ApiResponse<XShape>;
  if (!body.ok) throw new Error(`${body.error.code}: ${body.error.message}`);
  return body.data;
}
```

### 3. Tipos — mirror del backend

Todo tipo expuesto por la API vive en `frontend/src/types/` y debe ser
un **mirror exacto** de `backend/src/types/`. Cuando agregues un campo al
backend, actualiza ambos lados en el mismo PR.

**Las claves `PK` y `SK` nunca aparecen en el frontend** — usar `ProductPublic`,
no `ProductItem`.

### 4. Estilos — solo tokens de marca

Nunca usar valores hard-coded de color. Siempre referencia un token del tema:

```tsx
// ✅ Bueno
<div className="bg-ink text-bone border-line/40">

// ❌ Malo
<div className="bg-[#0f0f0d] text-[#fafaf7] border-[#262624]/40">
```

Tokens disponibles → `references/brand-tokens.md`

### 5. Tipografía — wordmark consistente

Cuando aparezca la palabra "ACACIA" como wordmark:
- All caps
- `font-weight: 300` (light)
- `letter-spacing: 0.3em` (var `--tracking-wordmark`)

Cuando aparezca "designed for the quiet":
- Italic
- `font-weight: 300`
- Color `text-mute`

### 6. Animaciones — sutiles, "quiet"

- Duración estándar: 500–600ms
- Easing: `[0.2, 0.8, 0.2, 1]` (slight ease-out)
- Stagger entre cards: `index * 0.05`
- Hover scale: máximo `1.03`
- **Prohibido:** bounces, springs notables, glows, neon, parallax agresivo

### 7. Estados — siempre cuatro

Toda vista que consuma data debe manejar **explícitamente**:
1. `isPending` → indicador sutil de carga
2. `isError` → mensaje de error + botón "Reintentar"
3. Vacío (`data` con length 0 o keys vacías) → mensaje italic con tono Acacia
4. Datos → renderizado normal

Nunca dejar la página en blanco mientras carga.

### 8. Imágenes

- Siempre `loading="lazy"` en `<img>`
- `alt` obligatorio con el nombre del producto
- Aspect ratio fijo con `aspect-[4/5]` para evitar layout shift
- Fallback gracioso si la URL no existe (placeholder con texto minimal)

### 9. WhatsApp como CTA

El catálogo no tiene carrito ni checkout. Cada producto redirige a WhatsApp:

```typescript
const url = `https://wa.me/${product.whatsappNumber}?text=${encodeURIComponent(product.whatsappMessage)}`;
```

Click target: la card entera (`<a>` que envuelve todo).
`target="_blank"` + `rel="noopener noreferrer"`.

### 10. Accesibilidad mínima

- Toda imagen con `alt`
- Toda área clickeable con `aria-label` si no tiene texto visible
- `target="_blank"` siempre con `rel="noopener noreferrer"`
- Focus visible — no remover el outline default sin reemplazarlo

---

## Endpoints Consumidos

| Endpoint | Hook | Tipo de retorno | Estado |
|---|---|---|---|
| `GET /products` | `useQuery(['products'])` | `ProductsByFamily` | ✅ |

Para agregar un nuevo endpoint:
1. Definir tipo en `types/`
2. Crear función en `api/<dominio>.ts`
3. Usar `useQuery` con `queryKey: ['<dominio>', ...params]`

Detalles en `references/patterns.md`.

---

## Agregar un Componente — Checklist

1. Crear `src/components/<NombreComponente>.tsx`
2. Definir `Props` como interface (no `type`) — más legible en errores
3. Importar tipos desde `@/types/...`
4. Usar solo clases Tailwind con tokens del tema
5. Si necesita animación, importar `motion` de framer-motion
6. Si necesita icono, importar de `lucide-react` con `strokeWidth={1.2}` (line-style)
7. Exportar como **named export** (no default), excepto `App.tsx` y páginas

Template completo → `references/patterns.md`

---

## Agregar una Página — Checklist

1. Crear `src/pages/<Nombre>.tsx`
2. Si necesita datos: `useQuery` con su propio `queryKey`
3. Manejar los 4 estados (loading, error, empty, data)
4. Agregar ruta en `App.tsx` (cuando se introduzca React Router)
5. Verificar responsive: 1 col mobile / 2 tablet / 3 desktop

---

## Variables de Entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | Base URL de la API (sin slash final) |

**Reglas:**
- Solo variables con prefijo `VITE_` se exponen al cliente
- Nunca commitear `.env.local` — está en `.gitignore`
- Tipar en `src/vite-env.d.ts`:
  ```typescript
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
  }
  ```

---

## Comandos Frecuentes

```bash
# Dev server (puerto 5175)
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Deploy completo (build + S3 + invalidación)
npm run deploy
# o equivalente: bash scripts/deploy.sh
```

---

## Deploy — Resumen

```
npm run build  →  dist/ generado
       ↓
aws s3 sync dist/ s3://acacia-catalog-spa --delete
       ↓
aws cloudfront create-invalidation --distribution-id E38C3UTB2ISSEA --paths "/*"
```

- Assets (`/assets/*`) → cache 1 año, immutable
- `index.html` → cache 0, must-revalidate (siempre fresco)
- Invalidación de `/*` después de cada deploy

Detalles completos → `references/deploy.md`

---

## Reglas de Calidad

- **Nunca** commitear `console.log` — solo `console.warn` o `console.error` para casos reales
- **Nunca** dejar `any` sin justificación en comentario adyacente
- **Nunca** mezclar `px` con `rem` — Tailwind ya usa `rem` por defecto
- **Nunca** importar con paths relativos largos (`../../../`) — usar alias `@/`
- **Nunca** romper la coherencia visual con shadows, gradientes brillantes o colores fuera del tema
- Toda nueva imagen debe ser `.webp` y vivir en `s3://acacia-catalog-images/<slug>/`
- Todo cambio de estilo debe verificarse en mobile + desktop antes de mergear

---

## Coordinación con otras skills

| Tarea | Skill a usar |
|---|---|
| Nuevo handler / endpoint backend | `acacia-backend` |
| Modificar schema DynamoDB | `acacia-backend` |
| Crear/modificar Lambda o SAM | `acacia-backend` o `acacia-catalog-aws` |
| Recurso AWS (S3, CloudFront, Cognito) | `acacia-catalog-aws` |
| Identidad visual, copy, brand voice | `acacia-brand-builder` |
| **Componente, página, estilos, deploy SPA** | **Esta skill** |

Cuando un feature toca front + back:
1. Definir el contrato (tipos) primero
2. Implementar backend con `acacia-backend`
3. Mirror del tipo en frontend (esta skill)
4. Construir el componente/página
5. Deploy ambos lados

---

## Referencias

Carga el archivo correspondiente según la tarea:

- `references/patterns.md` — templates de componente, hook, API client, manejo de estados
- `references/brand-tokens.md` — paleta completa, tipografía, spacing, tokens Tailwind
- `references/components.md` — catálogo de componentes existentes y cómo extenderlos
- `references/deploy.md` — workflow detallado de build + deploy + invalidación
- `references/scaling.md` — guía para agregar rutas, formularios, filtros, modales, auth cliente
