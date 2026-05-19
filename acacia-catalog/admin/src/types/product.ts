// admin/src/types/product.ts
// Mirror exacto de backend/src/types/product.ts (sin claves internas).

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
  featured?: boolean;
  order:     number;
  createdAt: string;
  updatedAt: string;
}

// Whitelist editable desde el panel (debe coincidir con backend ProductUpdateInput).
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
}
