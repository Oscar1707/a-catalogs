// backend/src/handlers/adminListTransactions.ts
// GET /admin/transactions — lista todos los movimientos financieros.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin }       from '../lib/adminAuth';
import { listTransactions }   from '../lib/dynamo';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Cache-Control':                'no-store',
} as const;

function json(s: number, b: unknown): APIGatewayProxyResult {
  return { statusCode: s, headers: HEADERS, body: JSON.stringify(b) };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const transactions = await listTransactions();
    return json(200, { ok: true, data: transactions });
  } catch (err) {
    console.error('[adminListTransactions]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al cargar transacciones.', requestId } });
  }
};
