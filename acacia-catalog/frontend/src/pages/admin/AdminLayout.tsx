// frontend/src/pages/admin/AdminLayout.tsx
// Layout para todas las páginas dentro de /admin/*
// (después de pasar el RequireAdmin guard).
//
// Estructura:
//   ┌─ Sub-header admin (acceso a secciones + logout)
//   └─ <Outlet />

import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const ADMIN_LINKS = [
  { label: 'Inicio',        to: '/admin'              },
  { label: 'Cotizaciones',  to: '/admin/cotizaciones' },
  { label: 'Productos',     to: '/admin/productos'    },
  { label: 'Slides',        to: '/admin/slides'       },
] as const;

const LINK_BASE     = 'text-[10px] font-light uppercase transition-colors md:text-xs';
const LINK_INACTIVE = 'text-mute hover:text-bone';
const LINK_ACTIVE   = 'text-bone';

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div>
      {/* Sub-header admin */}
      <div className="border-b border-line/60 bg-ink-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3 md:px-10">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-bone"
            aria-label="Inicio admin"
          >
            <Shield size={14} strokeWidth={1.2} className="text-amber" />
            <span
              className="text-[10px] font-light uppercase tracking-[0.25em]"
            >
              Admin
            </span>
          </Link>

          <nav aria-label="Admin" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {ADMIN_LINKS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/admin'}
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

        {/* Nav mobile (debajo del header en pantallas chicas) */}
        <nav
          aria-label="Admin móvil"
          className="border-t border-line/40 md:hidden"
        >
          <ul className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-6 py-3">
            {ADMIN_LINKS.map((item) => (
              <li key={item.to} className="whitespace-nowrap">
                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
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
      </div>

      <Outlet />
    </div>
  );
}
