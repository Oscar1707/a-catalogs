// backend/src/lib/auth.ts
// Hash de contraseñas (scrypt nativo de Node) + JWT (HS256).

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

// ── Configuración scrypt ──────────────────────────────────────────────────────
// N=16384, r=8, p=1 — defaults razonables, ~100ms en Lambda 256MB.
const SCRYPT_KEY_LEN = 64;
const SCRYPT_SALT_LEN = 16;

// ── Hash de password ──────────────────────────────────────────────────────────
// Formato del hash: `scrypt$<saltHex>$<derivedKeyHex>`
export function hashPassword(password: string): string {
  const salt = randomBytes(SCRYPT_SALT_LEN);
  const derived = scryptSync(password, salt, SCRYPT_KEY_LEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const salt    = Buffer.from(parts[1], 'hex');
  const stored2 = Buffer.from(parts[2], 'hex');
  const derived = scryptSync(password, salt, stored2.length);

  // Comparación de tiempo constante para evitar timing attacks
  return stored2.length === derived.length && timingSafeEqual(stored2, derived);
}

// ── JWT ───────────────────────────────────────────────────────────────────────

export interface AdminTokenPayload {
  sub:  'admin';        // único usuario por ahora
  iat?: number;
  exp?: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 horas

export function signAdminToken(secret: string): string {
  return jwt.sign(
    { sub: 'admin' },
    secret,
    { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS },
  );
}

export function verifyAdminToken(
  token: string,
  secret: string,
): AdminTokenPayload | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as AdminTokenPayload;
    if (payload.sub !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

export { TOKEN_TTL_SECONDS };
