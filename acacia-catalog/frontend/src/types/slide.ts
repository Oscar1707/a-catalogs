// frontend/src/types/slide.ts
// Mirror exacto de backend/src/types/slide.ts.
// Las claves PK / SK nunca aparecen en el frontend.

export const SLIDE_TYPES = ['product', 'service', 'promo'] as const;
export type SlideType = typeof SLIDE_TYPES[number];

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
