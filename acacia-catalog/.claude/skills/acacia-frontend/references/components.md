# Components — Catálogo Acacia Frontend

Inventario de componentes existentes y cómo extenderlos.

---

## Header

**Archivo:** `src/components/Header.tsx`
**Tipo:** Layout sticky

### Estructura
- Wordmark "ACACIA" izquierda + línea ámbar decorativa
- Slogan "designed for the quiet" a la derecha (oculto mobile)
- Sticky con backdrop blur

### Cómo extender
- Si se agrega navegación: insertar `<nav>` entre wordmark y slogan, con links espaciados (`gap-8`)
- Cada link: `text-sm font-light uppercase tracking-[0.15em]` con hover `text-bone`
- Nunca usar dropdowns hover — preferir submenús click (móvil-friendly)

---

## Footer

**Archivo:** `src/components/Footer.tsx`
**Tipo:** Layout estático

### Estructura
- Wordmark + slogan a la izquierda
- Social links (Instagram, WhatsApp) a la derecha
- Copyright en línea inferior con `tracking-[0.25em]`

### Cómo extender
- Para agregar columnas: cambiar el contenedor a `grid grid-cols-2 md:grid-cols-4 gap-8`
- Cada columna con título uppercase pequeño + lista de links
- Mantener Instagram + WhatsApp siempre visibles

---

## ProductCard

**Archivo:** `src/components/ProductCard.tsx`
**Tipo:** Presentacional + interactivo (link)

### Props
```typescript
interface Props {
  product: ProductPublic;
  index:   number;  // para stagger animation
}
```

### Estructura
- `<motion.a>` envolviendo todo (click target completo)
- Imagen con `aspect-[4/5]` + hover scale 1.03
- Bajo la imagen: nombre + ref (a derecha, tiny gris) → tagline italic → precio
- Overlay gradient sutil al hover

### Cómo extender
- Variante "compact" (futura): omitir tagline, ref en línea con nombre
- Si se agrega badge "Nuevo" / "Hecho a mano": esquina superior izquierda de la imagen, sin background, solo texto amber + tracking wide
- Para vista detalle (futura): mover el click a un `Link` de React Router en lugar del `<a>` a WhatsApp, y mover el WhatsApp CTA dentro de la página de detalle

### Reglas críticas
- El precio nunca debe ocultar el tagline — orden fijo: nombre → tagline → precio
- Sin sombras, sin border radius
- Hover: scale + overlay sutil, nada más

---

## FamilySection

**Archivo:** `src/components/FamilySection.tsx`
**Tipo:** Layout de sección con grid

### Props
```typescript
interface Props {
  family:   string;
  products: ProductPublic[];
}
```

### Estructura
- Header con nombre de family + contador "N piezas"
- Grid responsive 1/2/3 columnas
- Border-top entre secciones (excepto la primera)

### Cómo extender
- Para agregar filtros (precio, material): insertar fila de chips bajo el header
- Para colapsar secciones: agregar botón con estado `collapsed`, animar height con framer-motion

### Reglas
- El contador siempre "X pieza" (singular) o "X piezas" (plural) — usar lógica explícita, no `s` automático
- Sort por `product.order` ascendente, fallback 999

---

## Catalog (página)

**Archivo:** `src/pages/Catalog.tsx`
**Tipo:** Página completa

### Estructura
1. Hero — etiqueta de colección (amber) + headline grande + párrafo
2. Estados de carga / error / vacío
3. Map de families → `<FamilySection>`

### Cómo extender
- Para hero variantes: extraer a `src/components/Hero.tsx` con props `{ label, title, subtitle }`
- Para múltiples colecciones (futuro): el hero queda fijo, el filtro de colección va arriba del primer `FamilySection`

---

## App.tsx

**Tipo:** Root component

### Responsabilidades
- Envolver con `QueryClientProvider`
- Layout: Header → contenido → Footer
- En el futuro: `<BrowserRouter>` con rutas

### Configuración QueryClient
```typescript
defaultOptions: {
  queries: {
    retry: 1,
    refetchOnWindowFocus: false,
  },
}
```

No cambiar sin discusión — el catálogo es read-only y no necesita refetch agresivo.

---

## Componentes Faltantes (Roadmap)

### ProductDetail (página)
- Galería de imágenes (carrusel simple)
- Specs en tabla
- Selector de talla con precios dinámicos
- WhatsApp CTA persistente abajo (mobile) / sidebar (desktop)

### FilterBar (componente)
- Chips horizontales scrollables en mobile
- Filtros: family, material principal, rango de precio
- Estado en URL search params (no global state)

### Lightbox (componente)
- Para zoom de imágenes
- Sin librería externa — implementar con Framer Motion
- Cierre con ESC y click fuera

### Modal (componente)
- Genérico, accesible (focus trap, ESC, role="dialog")
- Para confirmaciones futuras (WhatsApp pre-mensaje custom, etc.)

### Skeleton (componente)
- Placeholder durante loading que mantenga el layout
- Reemplazo del actual spinner minimal en `Catalog.tsx`
- Card skeleton con animación shimmer sutil (no bouncing)

---

## Naming Conventions

- **Componentes:** PascalCase, sustantivos (`ProductCard`, `FamilySection`, no `ShowProducts`)
- **Hooks:** camelCase, prefijo `use` (`useProducts`, `useDebounce`)
- **Tipos:** PascalCase (`ProductPublic`, `ApiResponse`)
- **Props interfaces:** `Props` (local al archivo) o `<Name>Props` (si se exporta)
- **Archivos:** PascalCase para componentes, camelCase para todo lo demás
