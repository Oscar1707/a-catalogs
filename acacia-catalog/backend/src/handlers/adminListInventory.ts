// backend/src/handlers/adminListInventory.ts
// GET /admin/inventory — lista todos los materiales del inventario.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin }         from '../lib/adminAuth';
import { listInventoryItems }   from '../lib/dynamo';

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
    const items = await listInventoryItems();
    return json(200, { ok: true, data: items });
  } catch (err) {
    console.error('[adminListInventory]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al cargar inventario.', requestId } });
  }
};
