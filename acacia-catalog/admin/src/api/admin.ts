// admin/src/api/admin.ts
// Cliente HTTP del admin. Habla con la misma API del sitio público.

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn('[admin/api] VITE_API_URL no está definido');
}

interface ApiSuccess<T> { ok: true;  data: T; meta?: Record<string, unknown> }
interface ApiError      { ok: false; error: { code: string; message: string; requestId: string } }
type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface LoginResult {
  token:     string;
  expiresAt: string;
}

export async function adminLogin(password: string): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/admin/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify({ password }),
  });

  const body = (await res.json()) as ApiResponse<LoginResult>;

  if (!body.ok) {
    throw new Error(body.error.message || 'Credenciales inválidas');
  }

  return body.data;
}

/** Verifica que el JWT siga vivo. true = OK, false = 401. */
export async function adminHeartbeat(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/admin/me`, {
      method:  'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}
