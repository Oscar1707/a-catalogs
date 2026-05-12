import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Inicio',       to: '/'             },
  { label: 'Catálogo',     to: '/catalogo'     },
  { label: 'Cotizaciones', to: '/cotizaciones' },
  { label: 'Contacto',     to: '/contacto'     },
] as const;

const LINK_BASE =
  'text-[10px] font-light uppercase transition-colors md:text-xs';
const LINK_INACTIVE = 'text-mute hover:text-bone';
const LINK_ACTIVE   = 'text-bone';

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname }    = useLocation();

  // Cerrar el menú al cambiar de ruta.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el menú móvil está abierto.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 md:px-10">
        {/* ── Wordmark ─────────────────────────────────────── */}
        <NavLink
          to="/"
          className="flex items-baseline gap-2 text-bone"
          aria-label="Acacia — inicio"
        >
          <span
            className="text-lg font-light"
            style={{ letterSpacing: 'var(--tracking-wordmark)' }}
          >
            ACACIA
          </span>
          <span
            aria-hidden
            className="hidden h-px w-4 bg-amber md:inline-block"
          />
        </NavLink>

        {/* ── Nav desktop ──────────────────────────────────── */}
        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  style={{ letterSpacing: '0.15em' }}
                  className={({ isActive }) =>
                    `${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Tagline desktop (lg+) ────────────────────────── */}
        <p
          className="hidden text-[11px] font-light italic text-mute lg:block"
          style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
        >
          designed for the quiet
        </p>

        {/* ── Botón hamburguesa (mobile) ───────────────────── */}
        <button
          type="button"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="text-bone md:hidden"
        >
          {open
            ? <X    size={22} strokeWidth={1.2} />
            : <Menu size={22} strokeWidth={1.2} />}
        </button>
      </div>

      {/* ── Drawer mobile ──────────────────────────────────── */}
      <nav
        id="mobile-nav"
        aria-label="Móvil"
        aria-hidden={!open}
        className={`md:hidden overflow-hidden border-t border-line/40 bg-ink transition-[max-height,opacity] duration-500 ease-out ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul className="flex flex-col gap-1 px-6 py-6">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                style={{ letterSpacing: '0.15em' }}
                className={({ isActive }) =>
                  `block py-3 text-sm font-light uppercase ${
                    isActive ? LINK_ACTIVE : LINK_INACTIVE
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
