// admin/src/pages/Layout.tsx
// Layout autenticado. Header propio del admin + outlet de sub-rutas.

import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const NAV = [
  { label: 'Inicio',        to: '/'             },
  { label: 'Cotizaciones',  to: '/cotizaciones' },
  { label: 'Productos',     to: '/productos'    },
  { label: 'Slides',        to: '/slides'       },
] as const;

const LINK_BASE     = 'text-[10px] font-light uppercase transition-colors md:text-xs';
const LINK_INACTIVE = 'text-mute hover:text-bone';
const LINK_ACTIVE   = 'text-bone';

export function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col bg-ink">
      {/* ── Header admin ───────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink-soft backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 md:px-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-bone"
            aria-label="Acacia · Admin"
          >
            <Shield size={14} strokeWidth={1.2} className="text-amber" />
            <span
              className="text-sm font-light tracking-[0.25em] uppercase"
            >
              Acacia · Admin
            </span>
          </Link>

          <nav aria-label="Admin" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    style={{ letterSpacing: '0.2em' }}
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

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-[10px] font-light uppercase text-mute tracking-[0.2em] transition-colors hover:text-bone"
          >
            <LogOut size={12} strokeWidth={1.2} />
            Salir
          </button>
        </div>

        {/* Nav mobile (scrollable) */}
        <nav
          aria-label="Admin móvil"
          className="border-t border-line/40 md:hidden"
        >
          <ul className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-6 py-3">
            {NAV.map((item) => (
              <li key={item.to} className="whitespace-nowrap">
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  style={{ letterSpacing: '0.2em' }}
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
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line/40 py-8">
        <p className="mx-auto max-w-7xl px-6 text-[10px] font-light uppercase text-mute-dark tracking-[0.25em] md:px-10">
          Acacia · Panel administrativo · privado
        </p>
      </footer>
    </div>
  );
}
