// Tipos del configurador de producto.
// Cada producto que tenga configurador define un `ProductConfig`
// en src/data/configurators.ts. El componente ProductConfigurator
// lee esta estructura y renderiza el formulario de selección.

export type FieldType =
  | 'chips'      // opciones en fila de botones toggle
  | 'static'     // valor fijo (solo se muestra, no se selecciona)
  | 'conditional'; // chips que dependen del valor de otro campo

export interface ChipOption {
  value: string;
  label: string;     // texto en el chip
  hint?: string;     // descripción corta bajo el chip (opcional)
}

export interface ConfigField {
  key:          string;
  label:        string;   // "Ancho", "Acabado", etc.
  unit?:        string;   // "cm", "K", etc. — se añade al lado del label
  type:         FieldType;
  options?:     ChipOption[];
  staticValue?: string;   // solo cuando type === 'static'
  /** Solo para type === 'conditional':
   *  mostrar estas opciones si el campo `dependsOn` tiene el valor `whenValue` */
  dependsOn?:   string;
  whenValue?:   string;
  required?:    boolean;  // si true, bloquea el CTA hasta que se seleccione
}

export interface ProductConfig {
  /** Slug del producto al que pertenece este configurador. */
  slug: string;
  /** Título que aparece en el panel. */
  title: string;
  /** Subtítulo opcional bajo el título. */
  subtitle?: string;
  /** Campos del formulario en orden de aparición. */
  fields: ConfigField[];
  /** Tipo de proyecto para el backend (debe coincidir con PROJECT_TYPES). */
  projectType: string;
  /** Función que construye el mensaje de WhatsApp con las selecciones del usuario.
   *  `quoteRef` es el código ACW-YYYY-NNNN devuelto por el backend (disponible en step 3). */
  buildMessage: (
    selections:  Record<string, string>,
    productRef:  string,
    quoteRef?:   string,
  ) => string;
}
