// backend/src/lib/adminAuth.ts
// Helper para proteger handlers de admin. Extrae y verifica el JWT del header.
// Uso típico:
//
//   const auth = await requireAdmin(event);
//   if (!auth.ok) return auth.response;
//   // ...lógica del handler

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyAdminToken } from './auth';
import { getSecureParameter } from './ssm';

const JWT_SECRET_PARAM = process.env.JWT_SECRET_PARAM!;

interface AuthOk { ok: true }
interface AuthFail { ok: false; response: APIGatewayProxyResult }

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  process.env.CLOUDFRONT_DOMAIN
    ? `https://${process.env.CLOUDFRONT_DOMAIN}`
    : '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
} as const;

export async function requireAdmin(
  event: APIGatewayProxyEvent,
): Promise<AuthOk | AuthFail> {
  const requestId = event.requestContext?.requestId ?? 'local';

  // 1. Extraer header Authorization (case-insensitive)
  const headers = event.headers ?? {};
  const auth =
    headers.Authorization ??
    headers.authorization ??
    '';

  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return unauthorized(requestId, 'Token faltante.');
  }

  // 2. Verificar contra el JWT secret de SSM
  try {
    const secret  = await getSecureParameter(JWT_SECRET_PARAM);
    const payload = verifyAdminToken(match[1].trim(), secret);
    if (!payload) {
      return unauthorized(requestId, 'Token inválido o expirado.');
    }
    return { ok: true };
  } catch (err: unknown) {
    console.error('[adminAuth] error verificando token', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return unauthorized(requestId, 'No se pudo verificar el token.');
  }
}

function unauthorized(requestId: string, message: string): AuthFail {
  return {
    ok: false,
    response: {
      statusCode: 401,
      headers:    HEADERS,
      body:       JSON.stringify({
        ok:    false,
        error: { code: 'UNAUTHORIZED', message, requestId },
      }),
    },
  };
}
