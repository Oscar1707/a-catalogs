import { motion } from 'framer-motion';
import { Instagram, Facebook, MessageCircle, Music2 } from 'lucide-react';

/* ─── Datos de contacto reales de Acacia Woods ─── */

const WHATSAPP = '525639292363'; // formato wa.me
const WHATSAPP_DISPLAY = '+52 56 3929 2363';

const SOCIALS = [
  {
    label:  'WhatsApp',
    handle: WHATSAPP_DISPLAY,
    url:    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, me interesa conocer más sobre Acacia Woods.')}`,
    icon:   MessageCircle,
  },
  {
    label:  'Instagram',
    handle: '@acaciawoodsco',
    url:    'https://www.instagram.com/acaciawoodsco/',
    icon:   Instagram,
  },
  {
    label:  'Facebook',
    handle: 'Acacia Woods',
    url:    'https://www.facebook.com/profile.php?id=61572018329641&locale=es_LA',
    icon:   Facebook,
  },
  {
    label:  'TikTok',
    handle: '@acacia.woods',
    url:    'https://www.tiktok.com/@acacia.woods',
    icon:   Music2,
  },
] as const;

export function Contact() {
  return (
    <main className="mx-auto max-w-5xl px-6 md:px-10">
      {/* ── Header de página ────────────────────────────── */}
      <section className="border-b border-line/40 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
            Contacto
          </p>
          <h1
            className="text-4xl font-light leading-[1.1] text-bone md:text-5xl"
            style={{ letterSpacing: '-0.005em' }}
          >
            Hablemos de tu proyecto
          </h1>
          <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-mute">
            Atendemos por WhatsApp y redes sociales. Si prefieres, envía tu
            solicitud por la página de
            {' '}
            <a
              href="/cotizaciones"
              className="text-bone underline-offset-4 hover:underline"
            >
              cotizaciones
            </a>
            {' '}
            y te respondemos en menos de 24 horas.
          </p>
        </motion.div>
      </section>

      {/* ── Grid de redes ──────────────────────────────── */}
      <section className="grid grid-cols-1 gap-px bg-line/40 py-px md:grid-cols-2">
        {SOCIALS.map(({ label, handle, url, icon: Icon }, i) => (
          <motion.a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.5,
              delay:    i * 0.05,
              ease:     [0.2, 0.8, 0.2, 1],
            }}
            className="group flex items-center justify-between gap-6 bg-ink px-6 py-10 transition-colors hover:bg-ink-soft md:px-10 md:py-14"
            aria-label={`Abrir ${label}`}
          >
            <div>
              <p className="mb-3 text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                {label}
              </p>
              <p
                className="text-xl font-light text-bone md:text-2xl"
                style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
              >
                {handle}
              </p>
            </div>
            <Icon
              size={28}
              strokeWidth={1.2}
              className="text-mute transition-colors group-hover:text-amber"
            />
          </motion.a>
        ))}
      </section>

      {/* ── Horario / nota ──────────────────────────────── */}
      <section className="border-t border-line/40 py-16 md:py-20">
        <p className="max-w-lg text-sm font-light italic text-mute">
          Hecho a mano en México · Atención de lunes a sábado.
        </p>
      </section>
    </main>
  );
}
