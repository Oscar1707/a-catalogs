// Mirror de backend/src/types/product.ts — mantener sincronizado.

export interface TallaInfo {
  dimensiones: string;
  esBase:      boolean;
}

export interface PriceEntry {
  label:    string;
  price:    number | null;
  currency: string;
}

export interface ProductPublic {
  id:     string;
  name:   string;
  ref:    string;
  family: string;
  linea:  string;
  slug:   string;
  skuRef: string;

  description: string;
  tagline:     string;
  categoria:   string;

  specs: Record<string, string>;

  materialPrincipal: string;
  acabado:           string;
  iluminacion:       string;
  instalacion:       string;

  tallaBase: string;
  tallas:    Record<string, TallaInfo>;

  prices: PriceEntry[];

  images:     string[];
  coverImage: string;

  whatsappNumber:  string;
  whatsappMessage: string;

  active:    boolean;
  order:     number;
  createdAt: string;
  updatedAt: string;
}

export type ProductsByFamily = Record<string, ProductPublic[]>;

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
