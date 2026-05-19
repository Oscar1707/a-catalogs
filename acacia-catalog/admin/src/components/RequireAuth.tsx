// admin/src/components/RequireAuth.tsx
// Route guard. Si no hay token válido redirige a /login.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function RequireAuth() {
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
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
