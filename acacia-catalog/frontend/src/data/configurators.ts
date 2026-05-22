// Configuraciones de personalización por producto.
// Para agregar un nuevo producto con configurador:
//   1. Duplicar el bloque de LUMINA como plantilla.
//   2. Definir los campos y opciones del producto.
//   3. Escribir la función buildMessage.
//   4. Exportar en el mapa CONFIGURATORS (al final del archivo).

import type { ProductConfig } from '@/types/configurator';

// ─── LUMINA — Repisa flotante con iluminación LED ────────────────────────────

const LUMINA_CONFIG: ProductConfig = {
  slug:     'lumina',
  title:    'Personalizar LUMINA',
  subtitle: 'Repisa flotante · Iluminación LED integrada',

  fields: [
    {
      key:      'ancho',
      label:    'Ancho',
      unit:     'cm',
      type:     'chips',
      required: true,
      options: [
        { value: '60',  label: '60'  },
        { value: '80',  label: '80'  },
        { value: '100', label: '100' },
        { value: '120', label: '120' },
        { value: '140', label: '140' },
        { value: '160', label: '160' },
        { value: '180', label: '180' },
        { value: '200', label: '200' },
        { value: '220', label: '220' },
        { value: 'Personalizado', label: 'Otro' },
      ],
    },
    {
      key:      'profundidad',
      label:    'Profundidad',
      unit:     'cm',
      type:     'chips',
      required: true,
      options: [
        { value: '15', label: '15' },
        { value: '20', label: '20' },
        { value: '25', label: '25' },
        { value: '28', label: '28', hint: 'estándar' },
        { value: '30', label: '30' },
        { value: 'Personalizado', label: 'Otro' },
      ],
    },
    {
      key:          'altura',
      label:        'Altura',
      unit:         'cm',
      type:         'static',
      staticValue:  '6',
    },
    {
      key:      'acabado',
      label:    'Acabado',
      type:     'chips',
      required: true,
      options: [
        { value: 'Nogal natural',    label: 'Nogal natural',    hint: 'cálido' },
        { value: 'Roble europeo',    label: 'Roble europeo',    hint: 'claro' },
        { value: 'Fresno gris',      label: 'Fresno gris',      hint: 'neutro' },
        { value: 'Wengué',           label: 'Wengué',           hint: 'oscuro' },
        { value: 'Arce blanqueado',  label: 'Arce blanqueado',  hint: 'blanco' },
      ],
    },
    {
      key:      'cantidad',
      label:    'Número de repisas',
      type:     'chips',
      required: true,
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3', hint: 'estándar' },
        { value: '4', label: '4' },
        { value: '5', label: '5' },
        { value: '6+', label: '6+' },
      ],
    },
    {
      key:      'tipoLuz',
      label:    'Tipo de iluminación',
      type:     'chips',
      required: true,
      options: [
        { value: 'Tira LED',    label: 'Tira LED',    hint: 'continua' },
        { value: 'Lámpara LED', label: 'Lámpara LED', hint: 'puntual'  },
      ],
    },
    // Opciones de TIRA LED — solo si tipoLuz === 'Tira LED'
    {
      key:         'tiraLed',
      label:       'Color de tira LED',
      type:        'conditional',
      dependsOn:   'tipoLuz',
      whenValue:   'Tira LED',
      required:    true,
      options: [
        { value: 'Cálida 2700K',       label: 'Cálida',    hint: '2700 K' },
        { value: 'Neutra 4000K',        label: 'Neutra',    hint: '4000 K' },
        { value: 'Blanca 6500K',        label: 'Blanca',    hint: '6500 K' },
        { value: 'RGB + Blanca 2700K',  label: 'RGB',       hint: '+ blanca' },
      ],
    },
    // Opciones de LÁMPARA LED — solo si tipoLuz === 'Lámpara LED'
    {
      key:         'lamparaLed',
      label:       'Tipo de lámpara LED',
      type:        'conditional',
      dependsOn:   'tipoLuz',
      whenValue:   'Lámpara LED',
      required:    true,
      options: [
        { value: 'G4 2700K',  label: 'G4',  hint: '2700 K · cálida'  },
        { value: 'G9 2700K',  label: 'G9',  hint: '2700 K · cálida'  },
        { value: 'G4 4000K',  label: 'G4',  hint: '4000 K · neutra'  },
        { value: 'G9 4000K',  label: 'G9',  hint: '4000 K · neutra'  },
      ],
    },
  ],

  projectType: 'Mueble a medida',

  buildMessage(sel, ref, quoteRef) {
    const luzDetalle = sel.tipoLuz === 'Tira LED'
      ? `Tira LED · ${sel.tiraLed ?? '—'}`
      : `Lámpara LED · ${sel.lamparaLed ?? '—'}`;

    return [
      quoteRef
        ? `Hola, estoy enviando mi configuración de LUMINA (ref. ${quoteRef}).`
        : `Hola, me interesa personalizar una repisa LUMINA (${ref}).`,
      ``,
      `📐 Medidas:`,
      `  Ancho:       ${sel.ancho ?? '—'} cm`,
      `  Profundidad: ${sel.profundidad ?? '—'} cm`,
      `  Altura:      6 cm (fija)`,
      `  Repisas:     ${sel.cantidad ?? '—'}`,
      ``,
      `🪵 Acabado: ${sel.acabado ?? '—'}`,
      `💡 Iluminación: ${luzDetalle}`,
      ``,
      quoteRef
        ? `Número de referencia: ${quoteRef}`
        : `¿Podrían darme más información y un precio?`,
    ].join('\n');
  },
};

// ─── Mapa global de configuradores ───────────────────────────────────────────
// Clave: slug del producto. Valor: su configuración.

export const CONFIGURATORS: Record<string, ProductConfig> = {
  lumina: LUMINA_CONFIG,
};

/** Devuelve el configurador del producto o `undefined` si no tiene. */
export function getConfigurator(slug: string): ProductConfig | undefined {
  return CONFIGURATORS[slug?.toLowerCase()];
}
