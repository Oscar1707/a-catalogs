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
  - [Sprint 9 — Páginas de detalle de producto](#sprint-9--páginas-de-detalle-de-producto)
- [Feature 02 · Panel de administración](#feature-02--panel-de-administración)
  - [Sprint A1 — Auth con JWT](#sprint-a1--auth-con-jwt)
  - [Sprint A1.5 — Migración a SPA independiente](#sprint-a15--migración-a-spa-independiente)
  - [Sprint A2 — Inbox de cotizaciones](#sprint-a2--inbox-de-cotizaciones)
- [Pendiente](#-pendiente)
- [Convenciones](#-convenciones)

---

## Feature 01 · Expansión del sitio

| Campo | Valor |
|---|---|
| Rama | `feature/site-expansion` |
| Inicio | 2026-05-11 |
| Estado | 🟢 **En producción** — Sprints 1, 2, 3, 4 y 9 completados · sitio live |
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

### Sprint 9 — Páginas de detalle de producto

**Estado:** ✅ Desplegado en producción · `/catalogo/:slug` activo

#### Decisión arquitectónica clave

**Cero llamadas extra a la API** — el detalle reutiliza el cache de
`useQuery(['products'])` que ya pobla la página `/catalogo`.

- Pro: navegación instantánea desde la card (datos en memoria)
- Pro: zero deploy de Lambda, zero costo DynamoDB adicional
- Pro: justifica el `staleTime: 30 min` global del QueryClient
- Con: si entras directo por URL profunda, se carga TODO el catálogo
  antes de mostrar el detalle — aceptable porque tenemos pocos productos

#### Cambios en UX

| Antes | Ahora |
|---|---|
| Click en card → WhatsApp directo | Click en card → `/catalogo/:slug` (detalle) |
| Card era el único punto de info | Detalle expone galería, specs por talla, precios, material |
| Sin URL compartible por pieza | Cada pieza tiene URL pública (`/catalogo/vorden`) |

#### Frontend — archivos

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/ProductDetail.tsx` 🆕 | Página de detalle: galería con miniaturas + info + specs por talla + materiales + CTA WhatsApp · Manejo 404 propio |
| `frontend/src/components/ProductCard.tsx` | `<motion.a>` → `<motion.div><Link>` interna · pierde el target WhatsApp directo |
| `frontend/src/App.tsx` | + ruta `/catalogo/:slug` antes del catch-all |

#### Estructura del detalle

```
┌─ Breadcrumb "← Catálogo"
├─ Hero 2 cols (desktop) / stack (mobile)
│   ├─ Galería: imagen principal + grid de miniaturas
│   └─ Info: línea · nombre · ref · tagline · descripción
│            precio destacado · CTA WhatsApp · nota "puede ajustarse"
├─ Specs por talla (S/M/L/XL) — dimensiones + precio + flag "Base"
└─ Materia — material principal, acabado, iluminación, instalación
```

#### Manejo de estados

- `isPending` → indicador sutil tipo "Cargando pieza" centrado
- `isError` → mensaje + botón Reintentar (consistente con catálogo)
- **Slug no encontrado** → vista 404 con tono Acacia + link "Volver al catálogo"
- Sin imágenes → placeholder con texto "Sin imagen"

#### Smoke tests producción

```
✅ /catalogo/vorden       → 200 · detalle renderiza
✅ /catalogo/noren        → 200 · detalle renderiza
✅ /catalogo/nonexistent  → 200 · 404 manejado en cliente
```

#### Bundle deployado

| Asset | Tamaño | gzip |
|---|---|---|
| JS | ~380 KB (+20 KB vs Sprint 4) | ~118 KB |

---

### Hotfix · Scroll-to-top + primeras imágenes reales

**Fecha:** 2026-05-16

#### 🐛 Bug fix: scroll preservado al cambiar de ruta

React Router 6 mantiene la posición de scroll cuando navegas entre rutas. Si
estabas scrolleado abajo en `/catalogo` y dabas click en "Contacto", llegabas
con la misma posición de scroll — sentía como que la página no cargaba.

**Fix:** componente `ScrollToTop` que escucha `pathname` y resetea al tope en
cada navegación. Respeta anchors (`#seccion`) — si la URL tiene hash, no
interfiere para no romper futuros anchor links.

| Archivo | Cambio |
|---|---|
| `frontend/src/components/ScrollToTop.tsx` 🆕 | Listener de `useLocation` + `window.scrollTo({top:0})` |
| `frontend/src/App.tsx` | Monta `<ScrollToTop />` dentro del `QueryClientProvider` |

#### 🖼️ Primeras imágenes del catálogo en producción

3 piezas con imagen real (las demás siguen con placeholder gris):

| Slug | WebP final | Reducción vs original |
|---|---|---|
| `lumina` | 124 KB | 2.0 MB → 124 KB (-94%) |
| `strave` | 118 KB | 1.9 MB → 118 KB (-94%) |
| `dakota` | 163 KB | 154 KB → 163 KB (similar, ya venía optimizada) |

**Pipeline:** PNG/JPG → `cwebp -q 82 -resize 1600 0 -mt` → S3 (`Cache-Control: max-age=31536000 immutable`) → DynamoDB update (`coverImage` + `images[]`).

#### Script reutilizable creado

`scripts/upload_product_images.sh <slug> <img1> [img2] ...`

Resuelve la PK desde el slug, convierte a WebP, sube a S3 (cada slug en su carpeta), actualiza DynamoDB en una sola operación.

```bash
# Uso futuro:
./scripts/upload_product_images.sh vorden ~/Desktop/vorden-{01,02,03}.png
```

---

## Feature 02 · Panel de administración

| Campo | Valor |
|---|---|
| Rama | `feature/site-expansion` |
| Inicio | 2026-05-18 |
| Estado | 🟢 Sprints A1 + A1.5 + A2 en producción · A3-A8 pendientes |
| URL admin | https://d2ccwjnserochq.cloudfront.net |
| URL público | https://d2pgrgppb9pktx.cloudfront.net (intacto) |

### Decisiones arquitectónicas confirmadas

- **Ubicación**: **SPA independiente** en CloudFront separado (no `/admin/*` del público)
- **Auth**: password único + JWT HS256 (no Cognito) — más simple para 1 admin
- **Storage de credenciales**: AWS SSM Parameter Store SecureString (cifrado por KMS)
- **Misma API Gateway** con endpoints `/admin/*` protegidos por middleware
- **Token storage en frontend**: localStorage (admin no expuesto a contenido de usuario)
- **TTL del token**: 8 horas
- **`<meta name="robots" content="noindex,nofollow">`** en admin para evitar indexación

### Sprint A1 — Auth con JWT

**Estado:** ✅ Desplegado en producción · smoke tests end-to-end pasaron

#### Recursos AWS

| Recurso | Identificador |
|---|---|
| SSM SecureString | `/acacia/admin/password-hash` |
| SSM SecureString | `/acacia/admin/jwt-secret` (64 bytes random base64) |
| Lambda POST | `acacia-admin-login` (timeout 15s · 256 MB) |
| Lambda GET | `acacia-admin-me` |
| Endpoint POST | `https://y0uumgj0b4.execute-api.us-east-1.amazonaws.com/prod/admin/login` |
| Endpoint GET | `https://y0uumgj0b4.execute-api.us-east-1.amazonaws.com/prod/admin/me` |

#### Backend — archivos

| Archivo | Cambio |
|---|---|
| `backend/src/lib/auth.ts` 🆕 | `hashPassword` (scrypt N=16384), `verifyPassword` (timingSafeEqual), `signAdminToken`/`verifyAdminToken` (HS256 8h) |
| `backend/src/lib/ssm.ts` 🆕 | `getSecureParameter()` con cache por módulo (sobrevive entre invocaciones del contenedor Lambda) |
| `backend/src/lib/adminAuth.ts` 🆕 | `requireAdmin(event)` — middleware reusable para futuros endpoints admin |
| `backend/src/handlers/adminLogin.ts` 🆕 | POST /admin/login · padding 250 ms anti-timing · validación 4-200 chars |
| `backend/src/handlers/adminMe.ts` 🆕 | GET /admin/me · heartbeat para validar token vivo |
| `backend/package.json` | +deps `jsonwebtoken@^9`, `@aws-sdk/client-ssm`, `@types/jsonwebtoken` |

#### Frontend — archivos

| Archivo | Cambio |
|---|---|
| `frontend/src/api/admin.ts` 🆕 | `adminLogin()`, `adminHeartbeat()` |
| `frontend/src/lib/auth.tsx` 🆕 | `AuthProvider` + `useAuth()` · persiste token en `localStorage` · valida heartbeat al cargar |
| `frontend/src/components/RequireAdmin.tsx` 🆕 | Route guard con `<Outlet>` · redirige a `/admin/login` con `state.from` |
| `frontend/src/pages/admin/AdminLogin.tsx` 🆕 | Form de password · navega a destino original tras login |
| `frontend/src/pages/admin/AdminLayout.tsx` 🆕 | Sub-header admin propio · nav responsive · botón salir |
| `frontend/src/pages/admin/AdminHome.tsx` 🆕 | Dashboard de bienvenida con 3 tarjetas (Cotizaciones · Productos · Slides) |
| `frontend/src/App.tsx` | + `AuthProvider` · + rutas `/admin/*` · oculta Header/Footer público en `/admin/*` |

#### Infra (SAM)

| Cambio en `template.yaml` |
|---|
| + Parámetros `AdminPasswordHashParam`, `JwtSecretParam` (defaults `/acacia/admin/*`) |
| + Env vars `ADMIN_PASSWORD_HASH_PARAM`, `JWT_SECRET_PARAM` en Globals |
| + `AdminLoginFunction` con IAM `ssm:GetParameter` + `kms:Decrypt` (alias/aws/ssm) |
| + `AdminMeFunction` con IAM mínima (solo JWT secret) |
| + Rutas `POST /admin/login`, `GET /admin/me` |

#### Script de inicialización

`scripts/set_admin_password.sh` (idempotente):
1. Pide password (silencioso) + confirmación
2. Genera hash scrypt con Node nativo
3. Genera JWT secret aleatorio (64 bytes base64)
4. `aws ssm put-parameter` con `--overwrite` para ambos

#### Seguridad implementada

- ✅ **Password hash con scrypt** (N=16384, r=8, p=1, salt 16B, key 64B)
- ✅ **Comparación tiempo constante** con `timingSafeEqual`
- ✅ **Padding mínimo 250ms** en endpoint login (anti-timing)
- ✅ **JWT HS256** con secret aleatorio en SSM SecureString
- ✅ **Token TTL 8h** (suficiente para una sesión de trabajo, no eterno)
- ✅ **SSM cache en módulo Lambda** (un solo `GetParameter` por cold start)
- ✅ **IAM mínima**: cada lambda solo accede a los parámetros que necesita
- ✅ **CORS estricto** con `Authorization` header allow-listed
- ⏳ **Pendiente**: rate limiting en endpoint /admin/login (API GW Usage Plan)
- ⏳ **Pendiente**: rotación automática del JWT secret

#### Bug encontrado durante el sprint

> **`AccessDeniedException` en `ssm:GetParameter`** — usé el helper SAM `SSMParameterReadPolicy` con un nombre de parámetro que empezaba con `/`. SAM construyó el ARN con doble slash, fallando el match. Fix: reemplazar por `Statement` policy directa con ARN construido manualmente (`arn:aws:ssm:...:parameter${ParamName}`).

#### Smoke tests producción

```
✅ POST /admin/login  password incorrecto → 401 UNAUTHORIZED
✅ POST /admin/login  password correcto   → 200 { token, expiresAt }
✅ GET  /admin/me     sin token           → 401 Token faltante
✅ GET  /admin/me     token válido        → 200 { role: "admin" }
✅ GET  /admin/me     token basura        → 401 Token inválido o expirado
✅ /admin             → SPA carga · RequireAdmin redirige a /admin/login
✅ /admin/login       → form renderiza
✅ Rutas públicas /, /catalogo, /cotizaciones, /contacto → 200 sin regresión
```

---

### Sprint A1.5 — Migración a SPA independiente

**Estado:** ✅ Desplegado en producción · ambos sitios online · auth flow verificado

#### Por qué se migró

En el Sprint A1 el admin vivía como ruta `/admin/*` dentro del SPA público. Esto tenía 3 problemas:

1. **Bundle público inflado** — todo el código admin viajaba al usuario final
2. **Deploys acoplados** — cualquier cambio admin requería redesplegar el público
3. **Sin aislamiento real** — no era "independiente" como pediste

#### Solución

Proyecto SPA **completamente independiente** en `admin/` con:

- Su propio `package.json`, Vite config, TypeScript config
- Su propio bucket S3 (`acacia-admin-spa`)
- Su propio CloudFront distribution (`EOP0HS9U0XUUZ`)
- Su propio deploy script (`admin/scripts/deploy.sh`)
- Mismo backend (cero duplicación de API ni Lambdas)

#### Recursos AWS nuevos

| Recurso | Identificador |
|---|---|
| S3 bucket admin | `acacia-admin-spa` (privado · OAC) |
| CloudFront OAC | `acacia-admin-oac` |
| CloudFront Distribution | `EOP0HS9U0XUUZ` |
| URL pública admin | https://d2ccwjnserochq.cloudfront.net |

#### Estructura nueva

```
acacia-catalog/
├── backend/        ← sin cambios (API única)
├── frontend/       ← sitio público (limpio de admin)
└── admin/          🆕
    ├── package.json
    ├── vite.config.ts (puerto dev 5180)
    ├── tsconfig.*.json
    ├── index.html (con <meta robots noindex>)
    ├── scripts/deploy.sh
    └── src/
        ├── api/admin.ts
        ├── lib/auth.tsx
        ├── components/RequireAuth.tsx
        ├── pages/{Login,Layout,Home}.tsx
        ├── styles/globals.css (mismos brand tokens)
        ├── App.tsx
        └── main.tsx
```

#### Cambios en SAM template

```yaml
+ AdminSpaBucket           # bucket S3 privado para admin
+ AdminSpaBucketPolicy     # OAC restringe acceso a CloudFront admin
+ AdminCloudFrontOAC       # OAC dedicado
+ AdminCloudFrontDistribution  # distribution independiente
+ AdminCloudFrontURL       # output
+ AdminDistributionId      # output (usado por admin/scripts/deploy.sh)
+ AdminSpaBucketName       # output
```

#### Limpieza en frontend público

- ❌ `frontend/src/pages/admin/` (toda la carpeta)
- ❌ `frontend/src/lib/auth.tsx`
- ❌ `frontend/src/api/admin.ts`
- ❌ `frontend/src/components/RequireAdmin.tsx`
- ✏️ `frontend/src/App.tsx` (quitar `AuthProvider`, rutas admin, lógica de ocultar Header)

#### Bundles comparativos (post-pivot)

| SPA | JS bundle | CSS | gzip |
|---|---|---|---|
| Público | 370 KB | 25 KB | 115 KB JS · 5 KB CSS |
| **Admin** | **319 KB** | **13 KB** | **103 KB JS · 4 KB CSS** |

El admin es más liviano que el público porque no carga ProductCard, Carousel, ProductDetail, ThemeProvider, etc.

#### Deploy independiente

```bash
# Solo público
cd frontend && npm run deploy

# Solo admin
cd admin && npm run deploy
```

Los dos no se pisan — invalidan distributions distintas.

#### Smoke tests producción (post-pivot)

```
SITIO PÚBLICO (sin código admin)
  ✅ /              200
  ✅ /catalogo      200
  ✅ /cotizaciones  200
  ✅ /contacto      200

ADMIN (independiente)
  ✅ /              200  (RequireAuth redirige a /login si sin token)
  ✅ /login         200  (form renderiza)
  ✅ /cotizaciones  200  (placeholder, viene en A2)
  ✅ <meta name="robots" content="noindex,nofollow"> presente

API
  ✅ POST /admin/login  password incorrecto → 401
  ✅ GET  /admin/me     sin token           → 401
```

#### Costo adicional
- S3 bucket admin: ~$0 (< 400 KB de assets)
- CloudFront admin: incluido en free tier 50 GB/mes
- **Total adicional: $0**

---

### Sprint A2 — Inbox de cotizaciones

**Estado:** ✅ Desplegado en producción · 4 endpoints admin activos · inbox + detalle UI completos

#### Recursos AWS nuevos

| Recurso | Identificador |
|---|---|
| Lambda GET | `acacia-admin-list-quotes` |
| Lambda GET | `acacia-admin-get-quote` |
| Lambda PATCH | `acacia-admin-update-quote-status` |
| Lambda POST | `acacia-admin-add-quote-note` |
| Endpoint GET | `/admin/quotes?status=<opcional>` |
| Endpoint GET | `/admin/quotes/{reference}` |
| Endpoint PATCH | `/admin/quotes/{reference}/status` |
| Endpoint POST | `/admin/quotes/{reference}/notes` |

#### Modelo de datos extendido

Las notas internas viven como items separados en la misma tabla `acacia-quotes`:

```
PK: QUOTE#ACW-2026-0001  SK: METADATA                    ← cotización
PK: QUOTE#ACW-2026-0001  SK: NOTE#2026-05-18T...#a1b2    ← nota interna
```

- **SK con timestamp ISO + sufijo random** ordena cronológicamente sin GSI · evita colisiones imposibles
- Cada nota es atómica → no riesgo de pisar la cotización al editar
- `Query` por `PK + begins_with(SK, "NOTE#")` devuelve todas las notas de una cotización

#### Backend — archivos

| Archivo | Cambio |
|---|---|
| `backend/src/types/quote.ts` | +`NoteItem`, `NotePublic`, `QuoteAdminSummary`, `QuoteAdminDetail`, `UpdateStatusInput`, `AddNoteInput` |
| `backend/src/lib/dynamo.ts` | +`scanAllQuotes(status?)`, +`updateQuoteStatus(ref, status)`, +`getQuoteNotes(ref)`, +`addQuoteNote(ref, text)` |
| `backend/src/handlers/adminListQuotes.ts` 🆕 | Listado con filtro por status · valida status en `QUOTE_STATUSES` |
| `backend/src/handlers/adminGetQuote.ts` 🆕 | Detalle + notas en paralelo (`Promise.all`) |
| `backend/src/handlers/adminUpdateQuoteStatus.ts` 🆕 | `UpdateItem` con `ConditionExpression: attribute_exists(PK)` → 404 si no existe |
| `backend/src/handlers/adminAddQuoteNote.ts` 🆕 | Validación cotización existe + agrega nota + actualiza `updatedAt` |

#### Frontend admin — archivos

| Archivo | Cambio |
|---|---|
| `admin/src/types/quote.ts` 🆕 | Mirror del backend |
| `admin/src/lib/apiClient.ts` 🆕 | `apiRequest()` con `Authorization: Bearer` automático + `AUTH_INVALID_EVENT` ante 401 |
| `admin/src/lib/auth.tsx` | + listener de `AUTH_INVALID_EVENT` → logout automático cuando token expira |
| `admin/src/api/quotes.ts` 🆕 | `listQuotes(status?)`, `getQuote(ref)`, `updateQuoteStatus(ref, s)`, `addQuoteNote(ref, t)` |
| `admin/src/components/StatusBadge.tsx` 🆕 | Badge visual con colores sutiles por estado |
| `admin/src/pages/Cotizaciones.tsx` 🆕 | Inbox: filtros chip-style por status · búsqueda local · tabla desktop / cards mobile · contadores por bucket |
| `admin/src/pages/CotizacionDetail.tsx` 🆕 | Detalle 2-col · selector status (mutation) · botones contacto (WhatsApp / email) · timeline de notas |
| `admin/src/pages/Home.tsx` | Tarjetas: Cotizaciones marcada "Disponible" · resto "Próximamente" desactivadas |
| `admin/src/App.tsx` | + rutas `/cotizaciones` y `/cotizaciones/:reference` |

#### UX implementada

**Inbox (lista):**
- 7 chips de filtro (Todas + 6 estados) con contador por bucket
- Buscador local: por referencia, nombre o teléfono (normaliza dígitos)
- Botón "Actualizar" con icono spinner durante refetch
- Tabla en desktop, cards en mobile (responsive)
- Click en cualquier fila → navega al detalle
- Empty state si hay 0 cotizaciones (mensaje distinto si hay filtro activo)

**Detalle:**
- Grid 2 columnas (info + acciones) en desktop, stack en mobile
- Selector de status: 6 botones, el activo destacado, click dispara mutation
- Botón WhatsApp con mensaje pre-llenado: "Hola {primerNombre}, te escribo de Acacia Woods sobre tu cotización {ref}."
- Botón Email (si el cliente proveyó correo) con subject pre-llenado
- Sección de notas: form arriba (textarea + contador 4000 chars) + timeline cronológica (más recientes arriba)
- 404 manejado: referencia inválida o no encontrada → vista propia con tono Acacia
- Optimistic UI: el form de nota se limpia al enviar; si falla muestra error sin perder el texto en estado

#### Seguridad

- ✅ Todos los endpoints admin protegidos con `requireAdmin()` middleware
- ✅ IAM mínima por Lambda (read-only para list/get, CrudPolicy para update/note)
- ✅ Validación de status contra enum servidor-side
- ✅ Validación regex de referencia `^ACW-\d{4}-\d{4}$`
- ✅ ConditionExpression `attribute_exists(PK)` evita updates a cotizaciones inexistentes
- ✅ Frontend: `apiRequest()` hace logout automático ante 401 (token expirado)
- ✅ Notes max 4000 caracteres validado en servidor y cliente

#### Detalles técnicos relevantes

- **Cache TanStack Query**: `staleTime: 30s` para admin (cambia más seguido que catálogo público)
- **Invalidación**: al cambiar status o agregar nota se invalida `['admin','quote',ref]` y `['admin','quotes']`
- **CORS API**: + `PATCH` agregado a `AllowMethods`
- **Sufijo random en SK de notas**: evita colisiones extremadamente improbables si dos notas se crean en el mismo ms

#### Smoke tests producción

```
✅ GET  /admin/quotes              sin token → 401
✅ GET  /admin/quotes/{ref}        sin token → 401
✅ Admin SPA /                     200
✅ Admin SPA /cotizaciones         200
✅ Admin SPA /cotizaciones/{ref}   200
✅ Público (sin regresión): /, /catalogo, /cotizaciones todos 200
✅ 2 cotizaciones reales en producción visibles desde inbox (ACW-2026-0001, ACW-2026-0002)
```

#### Bundles

| | Antes A2 | Después A2 |
|---|---|---|
| Admin JS | 319 KB | 353 KB (+34 KB nuevo código) |
| Admin gzip | 103 KB | 111 KB |
| Admin CSS | 13 KB | 20 KB |

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

### Hallazgos / Tech debt

- ✅ **Git resuelto** (Sprint 9): proyecto bajo control de versiones en rama `feature/site-expansion` del repo `Oscar1707/a-catalogs`. `.gitignore` excluye `node_modules`, `dist`, `.aws-sam`, `.env*`. Pendiente: `git push -u origin feature/site-expansion` cuando Oscar lo decida.

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
