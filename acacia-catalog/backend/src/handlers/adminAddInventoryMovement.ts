// backend/src/handlers/adminAddInventoryMovement.ts
// POST /admin/inventory/{id}/movement — registra entrada/salida de stock.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin }           from '../lib/adminAuth';
import { addInventoryMovement }   from '../lib/dynamo';
import { MovementType }           from '../types/inventory';

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

  let body: Record<string, unknown>;
  try { body = JSON.parse(event.body ?? '{}'); }
  catch { return json(400, { ok: false, error: { code: 'INVALID_JSON', message: 'Body inválido.' } }); }

  const { type, quantity, note, date } = body;

  if (!type || !quantity) {
    return json(400, { ok: false, error: { code: 'MISSING_FIELDS', message: 'Campos requeridos: type, quantity.' } });
  }
  if (type !== 'entrada' && type !== 'salida') {
    return json(400, { ok: false, error: { code: 'INVALID_TYPE', message: 'type debe ser "entrada" o "salida".' } });
  }

  try {
    const result = await addInventoryMovement(
      id,
      type as MovementType,
      Number(quantity),
      note ? String(note).trim() : undefined,
      date ? String(date) : undefined,
    );
    return json(200, { ok: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // ConditionalCheckFailedException — item no existe
    if (msg.includes('ConditionalCheckFailed')) {
      return json(404, { ok: false, error: { code: 'NOT_FOUND', message: 'Material no encontrado.' } });
    }
    console.error('[adminAddInventoryMovement]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al registrar movimiento.', requestId } });
  }
};
