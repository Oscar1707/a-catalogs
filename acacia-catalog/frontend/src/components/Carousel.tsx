import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SlidePublic } from '@/types/slide';

interface Props {
  slides:        SlidePublic[];
  intervalMs?:   number; // default 6000ms
}

/**
 * Carrusel del Home — autoplay con pausa en hover/focus, dots de navegación,
 * controles prev/next y CTA tipado por slide:
 *   - product · service → ruta interna (React Router <Link>)
 *   - promo             → URL externa (<a target="_blank">)
 */
export function Carousel({ slides, intervalMs = 6000 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = slides.length;

  // Autoplay — se reinicia si cambia el índice o el estado de pausa.
  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % count),
      intervalMs,
    );
    return () => window.clearTimeout(id);
  }, [index, paused, count, intervalMs]);

  // Reset del índice si la lista cambia y queda fuera de rango.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;

  const slide = slides[index];

  const next = () => setIndex((i) => (i + 1) % count);
  const prev = () => setIndex((i) => (i - 1 + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Destacados Acacia"
      className="relative overflow-hidden border border-line/40 bg-ink-soft"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative aspect-[16/9] md:aspect-[16/7]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0"
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${count}`}
          >
            {/* Imagen de fondo */}
            {slide.image ? (
              <img
                src={slide.image}
                alt=""
                loading={index === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-ink" />
            )}

            {/* Overlay de legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/40 to-transparent" />

            {/* Contenido textual */}
            <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
              <div className="max-w-2xl">
                <p className="mb-3 text-[10px] font-light uppercase text-amber tracking-[0.3em]">
                  {slideTypeLabel(slide.type)}
                </p>
                <h3
                  className="text-2xl font-light leading-[1.15] text-bone md:text-4xl"
                  style={{ letterSpacing: '-0.005em' }}
                >
                  {slide.title}
                </h3>
                {slide.subtitle && (
                  <p className="mt-3 max-w-lg text-sm font-light italic text-mute md:text-base">
                    {slide.subtitle}
                  </p>
                )}
                {slide.ctaLabel && slide.ctaTarget && (
                  <CtaButton
                    type={slide.type}
                    label={slide.ctaLabel}
                    target={slide.ctaTarget}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controles prev/next — solo si hay más de 1 slide */}
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Slide anterior"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 border border-line/60 bg-ink/60 p-2 text-bone backdrop-blur-sm transition-colors hover:bg-ink-soft md:left-5"
            >
              <ChevronLeft size={18} strokeWidth={1.2} />
            </button>
            <button
              type="button"
              aria-label="Slide siguiente"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 border border-line/60 bg-ink/60 p-2 text-bone backdrop-blur-sm transition-colors hover:bg-ink-soft md:right-5"
            >
              <ChevronRight size={18} strokeWidth={1.2} />
            </button>
          </>
        )}
      </div>

      {/* Dots de navegación */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-line/40 bg-ink py-4">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ir al slide ${i + 1}`}
              aria-current={i === index}
              className={`h-1 w-8 transition-colors ${
                i === index ? 'bg-amber' : 'bg-line hover:bg-mute-dark'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────────────────
 * CTA — el comportamiento depende del tipo de slide:
 *   product · service → React Router <Link>
 *   promo             → <a target="_blank">
 * ──────────────────────────────────────────────────────── */
interface CtaProps {
  type:   SlidePublic['type'];
  label:  string;
  target: string;
}

function CtaButton({ type, label, target }: CtaProps) {
  const className =
    'mt-6 inline-flex items-center gap-2 border border-line bg-ink/40 px-5 py-3 text-[11px] font-light uppercase text-bone tracking-[0.25em] backdrop-blur-sm transition-colors hover:bg-ink-soft';

  if (type === 'promo') {
    return (
      <a
        href={target}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
        <ArrowUpRight size={14} strokeWidth={1.2} />
      </a>
    );
  }

  return (
    <Link to={target} className={className}>
      {label}
      <ArrowUpRight size={14} strokeWidth={1.2} />
    </Link>
  );
}

function slideTypeLabel(type: SlidePublic['type']): string {
  switch (type) {
    case 'product': return 'Pieza destacada';
    case 'service': return 'Proyecto a medida';
    case 'promo':   return 'Novedad';
  }
}
