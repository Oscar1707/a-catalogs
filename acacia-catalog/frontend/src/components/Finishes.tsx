import { motion } from 'framer-motion';

interface Finish {
  name:        string;
  description: string;
}

const FINISHES: Finish[] = [
  { name: 'Nogal',              description: 'Madera maciza, veta cálida.' },
  { name: 'Acero matte',        description: 'Powder-coated negro RAL 9005.' },
  { name: 'Melamina',           description: 'Estructura interna, color tierra.' },
  { name: 'Laminado',           description: 'Superficies de alto tránsito.' },
  { name: 'Aluminio anodizado', description: 'Herrajes y detalles finos.' },
  { name: 'Vidrio ahumado',     description: 'Frentes traslúcidos, luz tamizada.' },
  { name: 'Microcemento',       description: 'Base sólida, textura mineral.' },
  { name: 'Corcho',             description: 'Aislamiento natural, tacto suave.' },
];

export function Finishes() {
  return (
    <section
      id="acabados"
      className="scroll-mt-24 border-t border-line/40 py-20 md:py-28"
    >
      <header className="mb-12 max-w-2xl md:mb-16">
        <p className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
          Materia
        </p>
        <h2
          className="text-3xl font-light leading-[1.15] text-bone md:text-4xl"
          style={{ letterSpacing: '-0.005em' }}
        >
          Acabados
        </h2>
        <p className="mt-6 max-w-lg text-sm font-light leading-relaxed text-mute">
          Materiales nobles, elegidos por cómo envejecen. Sin barniz brillante,
          sin herrajes dorados, sin ruido.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
        {FINISHES.map((finish, i) => (
          <motion.li
            key={finish.name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{
              duration: 0.5,
              delay:    (i % 4) * 0.05,
              ease:     [0.2, 0.8, 0.2, 1],
            }}
            className="border-t border-line/40 pt-5"
          >
            <h3
              className="text-base font-light text-bone"
              style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
            >
              {finish.name}
            </h3>
            <p className="mt-2 text-sm font-light italic text-mute">
              {finish.description}
            </p>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
