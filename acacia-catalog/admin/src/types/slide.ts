// admin/src/types/slide.ts
export const SLIDE_TYPES = ['product', 'service', 'promo'] as const;
export type SlideType = typeof SLIDE_TYPES[number];

export const SLIDE_TYPE_LABEL: Record<SlideType, string> = {
  product: 'Producto',
  service: 'Servicio',
  promo:   'Promo',
};

export interface SlidePublic {
  id:        string;
  type:      SlideType;
  title:     string;
  subtitle:  string;
  image:     string;
  ctaLabel:  string;
  ctaTarget: string;
  active:    boolean;
  order:     number;
}
