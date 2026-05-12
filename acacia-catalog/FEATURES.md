# Acacia Woods — Bitácora de Features

Documento vivo. Cada feature deja constancia de qué se construyó, qué quedó
desplegado en AWS y qué está pendiente. **Editar al cerrar cada sprint.**

---

## 📑 Índice

- [Feature 01 · Expansión del sitio (4 menús + cotizaciones + carrusel)](#feature-01--expansión-del-sitio)
  - [Sprint 1 — Navegación y estructura](#sprint-1--navegación-y-estructura)
  - [Sprint 2 — Carrusel desde DynamoDB](#sprint-2--carrusel-desde-dynamodb)
  - [Sprint 3 — Backend de cotizaciones](#sprint-3--backend-de-cotizaciones)
  - [Sprint 4 — Deploy frontend a producción](#sprint-4--deploy-frontend-a-producción)
- [Pendiente](#-pendiente)
- [Convenciones](#-convenciones)

---

## Feature 01 · Expansión del sitio

| Campo | Valor |
|---|---|
| Rama | `feature/site-expansion` |
| Inicio | 2026-05-11 |
| Estado | 🟢 **En producción** — Sprints 1, 2, 3 y 4 completados · sitio live |
| URL pública | https://d2pgrgppb9pktx.cloudfront.net |
| Objetivo | Migrar a sitio multi-página (Inicio · Catálogo · Cotizaciones · Contacto) con backend para cotizaciones |

### Decisiones de producto confirmadas

- Estructura de menú: **Inicio · Catálogo · Cotizaciones · Contacto** (cada uno con su página dedicada).
- Formulario de cotización: **Opción B — Diseño personalizado**.
- Validación de consulta de pedido: **referencia + teléfono** (sin auth por ahora).
- Cotizaciones se envían **manualmente** por WhatsApp / correo (sin SES por ahora).
- Tabla DynamoDB **nueva** y separada para cotizaciones (`acacia-quotes`).
- Slides del carrusel se cargarán **desde DynamoDB** (Sprint 2 pendiente).

---

### Sprint 1 — Navegación y estructura

**Estado:** ✅ Completado · build local pasa

#### Frontend

| Archivo | Cambio |
|---|---|
| `frontend/src/main.tsx` | + `BrowserRouter` |
| `frontend/src/App.tsx` | + Rutas (`/`, `/catalogo`, `/cotizaciones`, `/contacto`) · cache extendida 30 min (`staleTime`) · `gcTime` 1 h |
| `frontend/src/components/Header.tsx` | `NavLink` con ruta activa · hamburguesa móvil · `aria-expanded` · bloqueo de scroll del body al abrir drawer |
| `frontend/src/components/Footer.tsx` | Quitado `id="contacto"` (ya no es anchor) · `Link` a `/contacto` · WhatsApp con número real |
| `frontend/src/pages/Home.tsx` 🆕 | Hero · placeholder carrusel · destacados · consulta de pedido (form) |
| `frontend/src/pages/Catalog.tsx` | Sin hero (movido a Home) · + filtros por familia (frontend-only) · conserva `Finishes` |
| `frontend/src/pages/Quotes.tsx` 🆕 | Formulario 2 pasos (Diseño Personalizado) · honeypot anti-spam · vista de confirmación con botón copiar referencia |
| `frontend/src/pages/Contact.tsx` 🆕 | Grid 2x2 con WhatsApp · Instagram · Facebook · TikTok |

#### Detalles UX

- **Cache de catálogo**: `staleTime: 30 min`, `gcTime: 1 h` (productos cambian poco — evita refetches innecesarios).
- **Filtros**: por familia en el cliente, sin llamadas extras a la API.
- **Indicador de pasos** en formulario de cotización (1 Contacto → 2 Proyecto).
- **Confirmación post-envío** muestra `ACW-2026-XXXX` con botón de copiar.

#### Pendientes Sprint 1

- ⏳ Deploy del frontend a S3 + invalidación CloudFront.
- ⏳ Cargar imágenes reales de acabados (Oscar las subirá).

---

### Sprint 2 — Carrusel desde DynamoDB

**Estado:** ✅ Desplegado en AWS · smoke test pasa en producción

#### Decisión arquitectónica

Los slides viven en la **misma tabla `acacia-products`** con prefijo `PK: SLIDE#`.
Costo cero adicional, misma infra. Filtrado por `begins_with(PK, "SLIDE#")` en el scan.

#### Diseño de item `SLIDE#<id>`

```
PK: SLIDE#01     SK: METADATA
─────────────────────────────
id:        "01"
type:      "product" | "service" | "promo"
title:     "Colección Root & Light"
subtitle:  "Nogal, acero matte y luz ámbar 2700K"
image:     URL S3 (acacia-catalog-images/slides/...)
ctaLabel:  texto del botón
ctaTarget: URL externa o path interno
active:    true
order:     1
```

#### CTA por tipo de slide

| `type` | Comportamiento | Ejemplo `ctaTarget` |
|---|---|---|
| `product` | `<Link>` interno (React Router) | `/catalogo` o `/catalogo?familia=Mesas` |
| `service` | `<Link>` interno (React Router) | `/cotizaciones` |
| `promo` | `<a target="_blank">` externo | `https://www.instagram.com/acaciawoodsco/` |

#### Recursos AWS desplegados

| Recurso | Identificador |
|---|---|
| Lambda GET | `acacia-get-slides` |
| Endpoint | `https://y0uumgj0b4.execute-api.us-east-1.amazonaws.com/prod/slides` |
| Cache-Control | `public, max-age=300` (5 min en borde) |

#### Backend — archivos

| Archivo | Cambio |
|---|---|
| `backend/src/types/slide.ts` 🆕 | `SLIDE_TYPES`, `SlideItem`, `SlidePublic` |
| `backend/src/lib/dynamo.ts` | + `scanActiveSlides()` con proyección y ordenamiento por `order` |
| `backend/src/handlers/getSlides.ts` 🆕 | Handler con CORS + cache 5 min + manejo de errores |

#### Frontend — archivos

| Archivo | Cambio |
|---|---|
| `frontend/src/types/slide.ts` 🆕 | Mirror del backend |
| `frontend/src/api/slides.ts` 🆕 | `fetchSlides()` |
| `frontend/src/components/Carousel.tsx` 🆕 | Autoplay 6s · pausa en hover/focus · dots · controles prev/next · CTA tipado |
| `frontend/src/pages/Home.tsx` | Sustituye placeholder por `CarouselSection` (TanStack Query + graceful degradation) |

#### UX implementada

- **Autoplay**: 6s por slide, se reinicia si cambias manualmente
- **Pausa**: en `onMouseEnter` y `onFocus` (accesible)
- **Indicadores**: dots clickeables al pie con `aria-current`
- **Controles**: flechas prev/next (solo si hay >1 slide)
- **Transición**: fade 600ms con `AnimatePresence` de Framer
- **Loading**: placeholder discreto (no rompe el flujo del Home)
- **Empty/error**: el componente se oculta — no se muestra fallback ruidoso
- **Imagen**: la primera con `loading="eager"`, resto `lazy`

#### Bug fix durante el sprint

> **`ValidationException: ExpressionAttributeNames unused`** — al heredar `EXPR_NAMES` completo en `SLIDE_EXPR_NAMES` se declaraban nombres (`#name`, `#ref`, `#family`) que no se usaban en la proyección de slides. DynamoDB valida que cada nombre declarado se use al menos una vez. Fix: declarar solo `#order` y `#type` (los únicos reservados en la proyección de slide).

#### Seed de prueba ejecutado

3 slides ya activos en producción:

```
SLIDE#01 · product · "Colección Root & Light" → /catalogo
SLIDE#02 · service · "Diseño a la medida"     → /cotizaciones
SLIDE#03 · promo   · "Síguenos en Instagram"   → instagram.com/acaciawoodsco
```

> Imágenes en `s3://acacia-catalog-images/slides/01-03.webp` — pendiente que Oscar suba las webp reales.

#### Smoke test

```
✅ GET /slides → 200 · 3 slides en orden correcto · Cache-Control 5 min
```

---

### Sprint 3 — Backend de cotizaciones

**Estado:** ✅ Desplegado en AWS · smoke tests pasan en producción

#### Recursos AWS desplegados

| Recurso | Identificador |
|---|---|
| Tabla DynamoDB | `acacia-quotes` · PITR habilitado |
| Lambda POST | `acacia-post-quote` |
| Lambda GET | `acacia-get-quote-status` |
| Endpoint POST | `https://y0uumgj0b4.execute-api.us-east-1.amazonaws.com/prod/quotes` |
| Endpoint GET | `https://y0uumgj0b4.execute-api.us-east-1.amazonaws.com/prod/quotes/{reference}?phone=...` |

#### Diseño de tabla `acacia-quotes`

```
PK                       SK         Tipo de item
─────────────────────────────────────────────────
QUOTE#ACW-2026-0001     METADATA   Cotización completa
COUNTER#QUOTES          2026       Contador atómico anual
```

- **Billing**: `PAY_PER_REQUEST`
- **PITR**: habilitado (recuperación a cualquier punto en últimas 35 días)
- **Referencia**: `ACW-{año}-{secuencia:0000}` — generada con `UpdateItem ADD` para atomicidad

#### Estados de cotización (contrato)

```
Abierta → En revisión → Propuesta enviada
                                  ↓
                  Finalizada · Aceptada
                  Finalizada · Rechazada
                  Finalizada · Expirada  (30 días sin respuesta)
```

#### Campos persistidos (Diseño personalizado)

**Paso 1 — Contacto**
- `name`, `phone` (normalizado, solo dígitos), `email`, `address`

**Paso 2 — Proyecto**
- `projectType` (enum: Mueble a medida · Cocina integral · Clóset/vestidor · Centro de entrenamiento · Otro)
- `description`, `dimensions`, `finish`, `material`, `visualRef`, `budget`, `timeline`

**Control**
- `reference`, `status`, `createdAt`, `updatedAt`

#### Backend — archivos

| Archivo | Cambio |
|---|---|
| `backend/src/types/quote.ts` 🆕 | Enums, `QuoteItem`, `QuoteCreateInput`, `QuoteStatusResult`, `CounterItem` |
| `backend/src/lib/dynamo.ts` | + `QUOTES_TABLE`, `nextQuoteReference()`, `putQuote()`, `getQuoteByReference()` |
| `backend/src/handlers/postQuote.ts` 🆕 | Validación · contador atómico · persistencia |
| `backend/src/handlers/getQuoteStatus.ts` 🆕 | Validación regex referencia · comparación de teléfono · 404 sin leak |

#### Frontend — conectado a API real

| Archivo | Cambio |
|---|---|
| `frontend/src/types/quote.ts` 🆕 | Mirror del backend |
| `frontend/src/api/quotes.ts` 🆕 | `createQuote()`, `fetchQuoteStatus()` |
| `frontend/src/pages/Quotes.tsx` | `useMutation` real · estado de loading · manejo de error · enum importado del tipo |
| `frontend/src/pages/Home.tsx` | `CheckOrderStatus` usa `useMutation` + componente `StatusResult` |

#### Infra (SAM)

| Cambio en `template.yaml` |
|---|
| + `QuotesTable` (DynamoDB, PITR on) |
| + `QUOTES_TABLE_NAME` en environment vars globales |
| + `PostQuoteFunction` con `DynamoDBCrudPolicy` |
| + `GetQuoteStatusFunction` con `DynamoDBReadPolicy` |
| CORS API: `GET,POST,OPTIONS` |
| + Output `QuotesTableName` |

#### Seguridad

- ✅ **No-leak en consulta**: teléfono inválido → mismo `404` que referencia inexistente (no se puede determinar si una ref existe sin saber el teléfono asociado).
- ✅ **Validación servidor**: longitudes, regex de referencia (`^ACW-\d{4}-\d{4}$`), normalización de teléfono.
- ✅ **Honeypot anti-spam** en frontend (campo invisible que solo bots llenan).
- ✅ **Contador atómico**: `UpdateExpression: ADD #v :one` con `ReturnValues: UPDATED_NEW` garantiza unicidad bajo escrituras concurrentes.
- ⏳ **Pendiente**: rate limiting en API Gateway (Usage Plan ~1 req/seg por IP).

#### Smoke tests ejecutados en producción

```
✅ POST /quotes (datos válidos)         → 201 · referencia ACW-2026-0001
✅ GET con teléfono correcto            → 200 · estatus devuelto
✅ GET con teléfono incorrecto          → 404 · sin leak de info
✅ GET referencia inexistente           → 404 · mismo error
✅ POST con datos inválidos             → 400 · errores detallados
```

> Item de prueba y contador 2026 fueron eliminados tras los tests para que la primera cotización real sea `ACW-2026-0001`.

---

### Sprint 4 — Deploy frontend a producción

**Estado:** ✅ Sitio público en CloudFront · todas las rutas verificadas

#### Pipeline ejecutado

```
npm run build         → dist/ (TS check + Vite build)
aws s3 sync dist/     → s3://acacia-catalog-spa
  · assets/*  → Cache-Control: public, max-age=31536000, immutable
  · index.html → Cache-Control: public, max-age=0, must-revalidate
aws cloudfront create-invalidation /*
```

#### Bundle servido en producción

| Asset | Tamaño | gzip |
|---|---|---|
| `index-Dh-PvxBT.js` | 360 KB | 113 KB |
| `index-_ml2A4re.css` | 23.8 KB | 5.1 KB |
| `index.html` | 0.93 KB | 0.49 KB |

#### Smoke tests en producción

```
✅ GET https://d2pgrgppb9pktx.cloudfront.net/             → 200
✅ GET https://d2pgrgppb9pktx.cloudfront.net/catalogo     → 200
✅ GET https://d2pgrgppb9pktx.cloudfront.net/cotizaciones → 200
✅ GET https://d2pgrgppb9pktx.cloudfront.net/contacto     → 200
✅ GET /slides desde Origin CloudFront                    → 200 · 3 items
✅ OPTIONS /quotes (CORS preflight)                       → 200
```

> Rutas profundas funcionan al recargar gracias a `CustomErrorResponses`
> en CloudFront (403/404 → `/index.html` con código 200) — ya estaba
> configurado en `template.yaml`.

#### Cache strategy

- **Assets hasheados** (JS/CSS): `max-age=31536000 immutable` — 1 año, nunca se revalidan; el hash en el nombre garantiza invalidación implícita en cada build.
- **`index.html`**: `max-age=0 must-revalidate` — siempre se pide el último; el HTML referencia los nuevos hashes de assets.
- **Invalidación `/*`** después de cada deploy para forzar refresh del HTML.

#### Comando para futuros deploys

```bash
cd frontend
npm run deploy   # build + s3 sync + invalidación
```

---

## ⏳ Pendiente

### Mejoras futuras

- [ ] Endpoint admin `GET /quotes` (listado para Oscar)
- [ ] Panel admin web con auth (Cognito) para ver cotizaciones
- [ ] Rate limiting API Gateway Usage Plan
- [ ] Job programado para marcar cotizaciones como "Finalizada · Expirada" tras 30 días
- [ ] Notificación a Oscar (SES) cuando entre nueva cotización — bloqueado hasta tener dominio
- [ ] Imágenes reales de acabados / materiales en Catálogo
- [ ] Imágenes reales de los slides (`s3://acacia-catalog-images/slides/01-03.webp`)
- [ ] Flag `featured: true` en productos para destacados dinámicos en Home
- [ ] Páginas de detalle `/catalogo/:slug`

### Hallazgos / Tech debt

- ⚠️ **Git**: el folder `acacia-catalog/` no está bajo control de versiones. El repo padre `a-catalogs/` solo trackea HTML antiguo. **Decisión pendiente** de Oscar: inicializar repo nuevo en `acacia-catalog/`, agregarlo al padre, o push a remote nuevo.

---

## 📐 Convenciones

### Branching

- Features nuevos: `feature/<nombre-corto>`
- Hotfixes: `fix/<nombre-corto>`
- Una feature = una rama = un PR (cuando exista repo).

### Endpoints

- Envelope siempre: `{ ok: true, data, meta? }` | `{ ok: false, error: { code, message, requestId } }`
- Códigos de error: `BAD_JSON`, `VALIDATION_ERROR`, `BAD_REQUEST`, `NOT_FOUND`, `DYNAMO_*`, `INTERNAL_ERROR`
- CORS desde `CLOUDFRONT_DOMAIN` env var (fallback `*` en local)

### Tipos

- Backend en `backend/src/types/<dominio>.ts`
- Frontend en `frontend/src/types/<dominio>.ts` (mirror exacto, sin `PK`/`SK`)
- Actualizar ambos en el mismo cambio

### DynamoDB

- `PK` con prefijo de tipo: `PRODUCT#`, `QUOTE#`, `COUNTER#`, `SLIDE#` (Sprint 2)
- `SK = METADATA` para items principales
- `name`, `ref`, `order` son palabras reservadas → siempre `ExpressionAttributeNames`
- Billing: `PAY_PER_REQUEST` (cost target ~$0–3/mes)

### Frontend

- Solo TanStack Query para data del servidor — nunca `useEffect` para fetching
- Solo tokens Tailwind del tema (`bg-ink`, `text-bone`, `border-line`...)
- 4 estados siempre: `isPending` · `isError` · vacío · datos
- Animaciones sutiles: duración 500-600ms, easing `[0.2, 0.8, 0.2, 1]`
