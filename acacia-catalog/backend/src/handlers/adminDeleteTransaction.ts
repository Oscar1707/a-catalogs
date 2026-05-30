// backend/src/handlers/adminDeleteTransaction.ts
// DELETE /admin/transactions/{id} — elimina un movimiento financiero.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin }       from '../lib/adminAuth';
import { deleteTransaction }  from '../lib/dynamo';

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

  const id = event.pathParameters?.id;
  if (!id) return json(400, { ok: false, error: { code: 'MISSING_ID', message: 'ID requerido.' } });

  try {
    await deleteTransaction(id);
    return json(200, { ok: true });
  } catch (err) {
    console.error('[adminDeleteTransaction]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al eliminar transacción.', requestId } });
  }
};
