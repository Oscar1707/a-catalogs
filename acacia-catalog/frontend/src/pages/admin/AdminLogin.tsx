// frontend/src/pages/admin/AdminLogin.tsx
// Pantalla de login del admin. Tono Acacia, mínima, sin distracciones.

import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface LocationState {
  from?: string;
}

export function AdminLogin() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? '/admin';

  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Si ya hay sesión activa, ir directo al destino
  if (token) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setBusy(true);
    setError(null);
    try {
      await login(password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16 md:px-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="mb-10 flex items-center gap-3">
          <Lock size={16} strokeWidth={1.2} className="text-amber" />
          <span
            className="text-[11px] font-light uppercase text-amber"
            style={{ letterSpacing: '0.3em' }}
          >
            Acceso administrador
          </span>
        </div>

        <h1
          className="text-3xl font-light leading-[1.1] text-bone md:text-4xl"
          style={{ letterSpacing: '-0.005em' }}
        >
          Inicia sesión
        </h1>

        <p className="mt-5 text-sm font-light leading-relaxed text-mute">
          Esta área es privada. Ingresa tu contraseña para administrar el
          catálogo y las cotizaciones.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5" noValidate>
          <label className="block">
            <span className="mb-2 block text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
              Contraseña
            </span>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="w-full border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none disabled:opacity-50"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="text-[11px] font-light text-amber-soft tracking-[0.05em]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !password}
            className="inline-flex w-full items-center justify-center gap-2 border border-amber/60 px-6 py-3 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Verificando…' : 'Entrar'}
            {!busy && <ArrowRight size={14} strokeWidth={1.2} />}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
