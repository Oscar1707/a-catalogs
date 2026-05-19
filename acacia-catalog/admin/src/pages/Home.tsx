// admin/src/pages/Home.tsx
// Dashboard inicial del admin. Cards de acceso a las secciones que vienen
// en próximos sprints.

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, FileText, LayoutGrid, Sliders } from 'lucide-react';

const SECTIONS = [
  {
    label:    'Cotizaciones',
    desc:     'Ver e ir gestionando las cotizaciones recibidas.',
    to:       '/cotizaciones',
    icon:     FileText,
    soon:     'Disponible',
    enabled:  true,
  },
  {
    label:    'Productos',
    desc:     'Activar/desactivar piezas, editar datos, marcar destacados.',
    to:       '/productos',
    icon:     LayoutGrid,
    soon:     'Disponible',
    enabled:  true,
  },
  {
    label:    'Slides',
    desc:     'Carrusel de inicio. Configurar acción del botón, reordenar.',
    to:       '/slides',
    icon:     Sliders,
    soon:     'Sprint A5',
    enabled:  false,
  },
] as const;

export function Home() {
  return (
    <div className="mx-auto max-w-7xl px-6 md:px-10">
      <section className="border-b border-line/40 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
            Bienvenido
          </p>
          <h1
            className="text-3xl font-light leading-[1.1] text-bone md:text-4xl"
            style={{ letterSpacing: '-0.005em' }}
          >
            Panel administrativo
          </h1>
          <p className="mt-5 max-w-xl text-sm font-light leading-relaxed text-mute">
            Desde aquí gestionas el catálogo público, las cotizaciones que
            llegan y el carrusel del inicio. Selecciona una sección para
            comenzar.
          </p>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 gap-px bg-line/40 py-px md:grid-cols-3">
        {SECTIONS.map(({ label, desc, to, icon: Icon, soon, enabled }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.5,
              delay:    i * 0.06,
              ease:     [0.2, 0.8, 0.2, 1],
            }}
            className={`bg-ink p-8 md:p-10 ${enabled ? '' : 'opacity-60'}`}
          >
            <Icon size={22} strokeWidth={1.2} className={enabled ? 'text-amber' : 'text-mute'} />
            <h2
              className="mt-6 text-xl font-light text-bone"
              style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
            >
              {label}
            </h2>
            <p className="mt-3 text-sm font-light leading-relaxed text-mute">
              {desc}
            </p>
            <div className="mt-6 flex items-center justify-between gap-3">
              {enabled ? (
                <Link
                  to={to}
                  className="inline-flex items-center gap-2 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:text-amber"
                >
                  Abrir
                  <ArrowUpRight size={12} strokeWidth={1.2} />
                </Link>
              ) : (
                <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                  Próximamente
                </span>
              )}
              <span
                className={`text-[10px] font-light uppercase tracking-[0.2em] ${enabled ? 'text-amber' : 'text-mute-dark'}`}
              >
                {soon}
              </span>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="py-16 md:py-20">
        <p className="text-[11px] font-light italic text-mute-dark">
          Las secciones marcadas con "Sprint Ax" estarán activas conforme se
          completen los próximos sprints del panel admin.
        </p>
      </section>
    </div>
  );
}
