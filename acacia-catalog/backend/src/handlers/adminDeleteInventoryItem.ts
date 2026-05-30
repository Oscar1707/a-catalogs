// backend/src/handlers/adminDeleteInventoryItem.ts
// DELETE /admin/inventory/{id} — elimina un material y todos sus movimientos.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin }         from '../lib/adminAuth';
import { deleteInventoryItem }  from '../lib/dynamo';

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
    await deleteInventoryItem(id);
    return json(200, { ok: true });
  } catch (err) {
    console.error('[adminDeleteInventoryItem]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al eliminar material.', requestId } });
  }
};
