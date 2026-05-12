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
  active:    boolean; // false = no aparece en la API
  order:     number;  // 1, 2, 3... — orden en el catálogo  ← RESERVADO en DynamoDB
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
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
