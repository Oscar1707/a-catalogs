// frontend/src/api/admin.ts
// Cliente para los endpoints del admin (login + heartbeat).

import type { ApiResponse } from '@/types/product';

const API_URL = import.meta.env.VITE_API_URL;

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
    throw new Error(body.error.message || 'Login fallido');
  }

  return body.data;
}

// Verifica que el token siga vivo. Devuelve true si ok, false si 401.
export async function adminHeartbeat(token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/admin/me`, {
    method:  'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.status === 200;
}
