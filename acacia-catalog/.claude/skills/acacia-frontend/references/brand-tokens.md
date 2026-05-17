# Brand Tokens — Acacia Frontend

Todos los tokens viven en `src/styles/globals.css` dentro del bloque `@theme`.
Tailwind v4 los expone automáticamente como utility classes (`bg-ink`, `text-bone`, etc).

---

## Paleta de Colores

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#0f0f0d` | Background principal (near-black) |
| `--color-ink-soft` | `#1a1a18` | Cards, secciones elevadas |
| `--color-bone` | `#fafaf7` | Texto principal sobre ink |
| `--color-walnut` | `#6b4a2b` | Acento — nogal warm |
| `--color-walnut-deep` | `#4a3220` | Acento profundo |
| `--color-amber` | `#ffb84a` | Luz 2700K — solo detalles (línea, label colección) |
| `--color-amber-soft` | `#e3a242` | Hover de amber |
| `--color-mute` | `#8a8a85` | Texto secundario, taglines |
| `--color-mute-dark` | `#4a4a47` | Texto terciario, refs SKU |
| `--color-line` | `#262624` | Borders, separadores |

**Reglas de uso:**
- `amber` **solo** para acentos pequeños (línea, label "COLECCIÓN", focus ring futuro).
  Nunca para fondos grandes ni botones primarios.
- `walnut` para hover sutil de acentos o futura decoración temática.
- Nunca usar `#000000` puro — siempre `ink`.
- Nunca usar `#ffffff` puro — siempre `bone`.

---

## Utility Classes

Cualquier color del tema funciona con todos los prefijos Tailwind:

```tsx
bg-ink           // background
text-bone        // color
border-line      // border-color
border-line/40   // border-color con 40% opacity
fill-amber       // SVG fill
ring-amber/30    // ring (focus)
```

---

## Tipografía

| Variable | Valor | Uso |
|---|---|---|
| `--font-sans` | `"Inter", system-ui, sans-serif` | Familia base |
| `--tracking-wordmark` | `0.3em` | Solo wordmark "ACACIA" |
| `--tracking-wide-soft` | `0.08em` | Headings, nombres de producto |

### Pesos disponibles
- `200` extralight — uso ocasional para hero gigante
- `300` light — **default** para casi todo
- `400` regular — body texts
- `500` medium — emphasis raro

### Sizes (Tailwind defaults, no custom)
- `text-xs` — refs SKU, labels uppercase
- `text-sm` — body, captions
- `text-base` — body principal
- `text-lg` — wordmark, nombres prominentes
- `text-2xl` / `text-3xl` — headers de family
- `text-4xl` / `text-6xl` — hero headline

### Reglas
- All-caps siempre con `tracking-[0.2em]` mínimo
- Italic solo para taglines y slogan — nunca para énfasis dentro de párrafos
- Line-height de body: `leading-relaxed` (1.625)
- Line-height de hero: `leading-[1.1]`

---

## Spacing

Tailwind defaults (no custom). Convenciones:

| Contexto | Tailwind |
|---|---|
| Padding lateral mobile | `px-6` |
| Padding lateral desktop | `md:px-10` |
| Max width contenedor | `max-w-7xl` |
| Padding vertical sección | `py-16 md:py-24` |
| Padding vertical hero | `py-24 md:py-32` |
| Gap entre cards (grid) | `gap-x-8 gap-y-14` |
| Gap entre items inline | `gap-2` / `gap-3` |

---

## Layout Grid

```tsx
grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3
```

- Mobile: 1 columna
- Tablet (`md`, ≥768px): 2 columnas
- Desktop (`lg`, ≥1024px): 3 columnas

**Nunca** ir a 4 columnas — rompe la respiración de la página.

---

## Componentes Visuales — Detalles

### Bordes
- Separadores: `border-line/40` o `border-line/60`
- Border radius: **0 (cero)** — la marca es geométrica y rígida
- Excepción: `rounded-full` para indicadores circulares (raro)

### Sombras
- **Prohibidas las sombras visibles.**
- Token disponible (uso muy raro): `--shadow-quiet` → `0 1px 0 rgba(255, 184, 74, 0.04)`

### Gradientes
- Solo para overlays sutiles sobre imágenes en hover:
  ```tsx
  bg-gradient-to-t from-ink/85 to-transparent
  ```
- **Prohibidos** los gradientes de marca como decoración (rompen el minimalismo).

### Hover states
- Scale máximo: `1.03`
- Transición: `transition-transform duration-[600ms] ease-out`
- Color: aclarar `text-mute → text-bone`
- Nunca cambiar dramáticamente — solo señalar interactividad

---

## Selección y Scrollbar

Definidos globalmente en `globals.css`:

- `::selection` → fondo ámbar, texto ink
- Scrollbar: 8px, track ink, thumb `line` con hover `mute-dark`

No tocar sin razón fuerte.

---

## Favicon y Logo

- Favicon: `public/favicon.svg` — monograma A con barra ámbar (option 2 del brand kit)
- Fondo: `#0f0f0d` (ink)
- Líneas: `#fafaf7` (bone) stroke 2.2
- Barra horizontal: `#ffb84a` (amber) stroke 2.4

Cuando se necesite un wordmark inline (header/footer), usar texto, no SVG.
