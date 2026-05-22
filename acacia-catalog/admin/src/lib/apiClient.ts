// admin/src/lib/apiClient.ts
// Helper de fetch con Authorization automático. Si recibe 401 limpia el
// token y dispara un evento que el AuthProvider escucha para hacer logout.

const API_URL = import.meta.env.VITE_API_URL;
const STORAGE_KEY = 'acacia.admin.token';
export const AUTH_INVALID_EVENT = 'acacia:auth-invalid';

interface ApiSuccess<T> { ok: true;  data: T; meta?: Record<string, unknown> }
interface ApiError      { ok: false; error: { code: string; message: string; requestId: string } }
type ApiResponse<T> = ApiSuccess<T> | ApiError;

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?:   unknown;
}

/**
 * Llama un endpoint admin con el token guardado.
 * - Lanza Error con el mensaje del backend si !res.ok.
 * - Si recibe 401 dispara `AUTH_INVALID_EVENT` para forzar logout.
 */
export async function apiRequest<T>(path: string, opts: Options = {}): Promise<T> {
  const token = localStorage.getItem(STORAGE_KEY);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method:  opts.method ?? 'GET',
    headers,
    body:    opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  // 401 → token expirado o inválido. Dispara evento para que AuthProvider
  // haga logout y RequireAuth redirija a /login.
  if (res.status === 401) {
    window.dispatchEvent(new Event(AUTH_INVALID_EVENT));
    throw new Error('Sesión expirada. Inicia sesión de nuevo.');
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) {
    throw new Error(`HTTP ${res.status} sin cuerpo válido.`);
  }

  if (!body.ok) {
    throw new Error(body.error.message || `HTTP ${res.status}`);
  }

  return body.data;
}
