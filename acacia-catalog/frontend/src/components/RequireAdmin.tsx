// frontend/src/components/RequireAdmin.tsx
// Route guard: si no hay token válido, redirige a /admin/login.
// Mientras el AuthProvider verifica el heartbeat (ready=false),
// mostramos un placeholder discreto para evitar parpadeos.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function RequireAdmin() {
  const { token, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-mute">
        <span className="text-[11px] font-light uppercase tracking-[0.3em]">
          Verificando sesión
        </span>
      </div>
    );
  }

  if (!token) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
