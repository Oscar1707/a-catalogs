// backend/src/handlers/adminLogin.ts
// POST /admin/login — recibe { password }, devuelve JWT firmado si coincide.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { signAdminToken, verifyPassword, TOKEN_TTL_SECONDS } from '../lib/auth';
import { getSecureParameter } from '../lib/ssm';

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS_ORIGIN = process.env.CLOUDFRONT_DOMAIN
  ? `https://${process.env.CLOUDFRONT_DOMAIN}`
  : '*';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store',
} as const;

const PASSWORD_HASH_PARAM = process.env.ADMIN_PASSWORD_HASH_PARAM!;
const JWT_SECRET_PARAM    = process.env.JWT_SECRET_PARAM!;

// Tiempo mínimo de respuesta — evita timing attacks que distingan
// "password incorrecto" de "usuario inexistente" (aunque solo hay 1).
const MIN_RESPONSE_MS = 250;

function json(status: number, body: unknown): APIGatewayProxyResult {
  return { statusCode: status, headers: HEADERS, body: JSON.stringify(body) };
}

function unauthorized(requestId: string): APIGatewayProxyResult {
  return json(401, {
    ok: false,
    error: {
      code:    'UNAUTHORIZED',
      message: 'Credenciales inválidas.',
      requestId,
    },
  });
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';
  const started   = Date.now();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  // Padding de tiempo constante
  const respond = async (res: APIGatewayProxyResult): Promise<APIGatewayProxyResult> => {
    const elapsed = Date.now() - started;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }
    return res;
  };

  // 1. Parse body
  let password = '';
  try {
    const body = JSON.parse(event.body ?? '{}');
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return respond(json(400, {
      ok: false,
      error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId },
    }));
  }

  if (!password || password.length < 4 || password.length > 200) {
    return respond(unauthorized(requestId));
  }

  try {
    // 2. Cargar hash + secret desde SSM (con cache en módulo)
    const [storedHash, jwtSecret] = await Promise.all([
      getSecureParameter(PASSWORD_HASH_PARAM),
      getSecureParameter(JWT_SECRET_PARAM),
    ]);

    // 3. Verificar
    if (!verifyPassword(password, storedHash)) {
      console.warn('[adminLogin] intento fallido', { requestId });
      return respond(unauthorized(requestId));
    }

    // 4. Firmar token y devolver
    const token = signAdminToken(jwtSecret);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

    console.log('[adminLogin] login exitoso', { requestId });

    return respond(json(200, {
      ok:   true,
      data: { token, expiresAt },
    }));

  } catch (err: unknown) {
    console.error('[adminLogin] error', {
      requestId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return respond(json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'Error interno. Intenta de nuevo.',
        requestId,
      },
    }));
  }
};
