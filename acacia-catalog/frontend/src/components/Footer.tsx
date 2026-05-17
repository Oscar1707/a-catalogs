import { Link } from 'react-router-dom';
import { Instagram, MessageCircle } from 'lucide-react';

const WHATSAPP = '525639292363';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line/60 bg-ink py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-end md:px-10">
        <div>
          <p
            className="text-lg font-light text-bone"
            style={{ letterSpacing: 'var(--tracking-wordmark)' }}
          >
            ACACIA
          </p>
          <p className="mt-2 text-sm font-light italic text-mute">
            designed for the quiet
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-col gap-3 text-sm text-mute md:items-end"
        >
          <Link
            to="/contacto"
            className="transition-colors hover:text-bone"
          >
            Contacto
          </Link>
          <a
            href="https://www.instagram.com/acaciawoodsco/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-bone"
          >
            <Instagram size={14} strokeWidth={1.2} />
            @acaciawoodsco
          </a>
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-bone"
          >
            <MessageCircle size={14} strokeWidth={1.2} />
            WhatsApp
          </a>
        </nav>
      </div>

      <p className="mx-auto mt-10 max-w-7xl px-6 text-[10px] font-light uppercase text-mute-dark tracking-[0.25em] md:px-10">
        © {year} Acacia · Hecho a mano en México
      </p>
    </footer>
  );
}
