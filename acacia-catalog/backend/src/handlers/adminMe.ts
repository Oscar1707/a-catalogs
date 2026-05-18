// backend/src/handlers/adminMe.ts
// GET /admin/me — valida el JWT y devuelve un OK simple.
// Útil para que el frontend verifique si el token sigue vivo al cargar.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';

const CORS_ORIGIN = process.env.CLOUDFRONT_DOMAIN
  ? `https://${process.env.CLOUDFRONT_DOMAIN}`
  : '*';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Cache-Control':                'no-store',
} as const;

function json(status: number, body: unknown): APIGatewayProxyResult {
  return { statusCode: status, headers: HEADERS, body: JSON.stringify(body) };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  return json(200, {
    ok:   true,
    data: { role: 'admin' },
  });
};
