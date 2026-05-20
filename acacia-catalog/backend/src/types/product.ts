// backend/src/types/product.ts
// Nota: "name", "ref", "order" son palabras reservadas en DynamoDB.
// Siempre usar ExpressionAttributeNames cuando se proyecten o filtren.

export interface TallaInfo {
  dimensiones: string;  // "160 × 40 × 35 cm"
  esBase:      boolean; // true = talla de producción estándar
}

export interface PriceEntry {
  label:    string;        // "M — Roble natural (Estándar)"
  price:    number | null; // null = cotización personalizada
  currency: string;        // "MXN"
}

export interface ProductItem {
  // Keys DynamoDB — nunca se exponen en la API
  PK: string; // "PRODUCT#aca-tv-001"
  SK: string; // "METADATA"

  // Identificación
  id:     string; // "ACA-TV-001"
  name:   string; // "VORDEN"           ← RESERVADO en DynamoDB
  ref:    string; // "ACA-TV-001"       ← RESERVADO en DynamoDB
  family: string; // "Muebles TV"       ← campo de agrupación
  linea:  string; // "Muebles para TV"
  slug:   string; // "vorden"
  skuRef: string; // "ACA-TV-001"

  // Contenido
  description: string; // descripción corta, tono Acacia
  tagline:     string; // "Luz que define la forma."
  categoria:   string; // "Mueble TV Flotante con Iluminación"

  // Especificaciones
  specs: Record<string, string>; // { "Dimensiones (M)": "160 × 40 × 35 cm" }

  // Material
  materialPrincipal: string;
  acabado:           string;
  iluminacion:       string;
  instalacion:       string;

  // Tallas
  tallaBase: string;                    // "M"
  tallas:    Record<string, TallaInfo>; // S / M / L / XL

  // Precios
  prices: PriceEntry[];
  // S = precio_M × 0.80  |  M = base  |  L = precio_M × 1.25  |  XL = precio_M × 1.55
  // price: null = cotización

  // Imágenes (URLs S3)
  images:     string[]; // ["https://acacia-catalog-images.s3.amazonaws.com/vorden/01.webp"]
  coverImage: string;   // primera imagen — usada en ProductCard

  // WhatsApp
  whatsappNumber:  string; // "5215512345678"
  whatsappMessage: string; // "Hola, me interesa el modelo VORDEN..."

  // Control
  active:    boolean;  // false = no aparece en la API pública
  featured?: boolean;  // true = aparece en "Piezas destacadas" del Home
  order:     number;   // 1, 2, 3... — orden en el catálogo  ← RESERVADO en DynamoDB
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

// ── Shape de creación admin (mínimo viable) ──────────────────────────────────
// Lo demás (precios, tallas, specs, imágenes) se llena editando después.
export interface ProductCreateInput {
  // Identificación — requeridos
  id:     string;  // "ACA-MES-005" — usado como PK
  ref:    string;  // generalmente igual al id
  slug:   string;  // "mesa-folse" — usado en /catalogo/:slug
  name:   string;
  family: string;

  // Opcionales
  linea?:           string;
  categoria?:       string;
  tagline?:         string;
  description?:     string;
  whatsappNumber?:  string;  // default 525639292363
  whatsappMessage?: string;
}

// ── Shape de actualización admin (todos los campos opcionales) ───────────────
// Whitelist de lo que se puede editar desde el panel admin.
// id/slug/ref/skuRef/createdAt/updatedAt no se editan (identifiers + auto).
// tallas/prices/specs se editan en un sub-sprint futuro (estructura compleja).
export interface ProductUpdateInput {
  name?:              string;
  tagline?:           string;
  description?:       string;
  categoria?:         string;
  family?:            string;
  linea?:             string;
  materialPrincipal?: string;
  acabado?:           string;
  iluminacion?:       string;
  instalacion?:       string;
  whatsappMessage?:   string;
  order?:             number;
  active?:            boolean;
  featured?:          boolean;
  // Imágenes — gestionadas desde el componente ImageUploader (Sprint A4)
  images?:            string[];
  coverImage?:        string;
}

// Shape público — sin claves internas de DynamoDB
export type ProductPublic = Omit<ProductItem, 'PK' | 'SK'>;

// Agrupado por family — shape de GET /products
export type ProductsByFamily = Record<string, ProductPublic[]>;

// ── Shapes de API ──────────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  ok:    true;
  data:  T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  ok:    false;
  error: {
    code:      string;
    message:   string;
    requestId: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
