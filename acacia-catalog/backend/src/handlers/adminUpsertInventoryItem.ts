// backend/src/handlers/adminUpsertInventoryItem.ts
// PUT /admin/inventory/{id} — crea o actualiza un material del inventario.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin }       from '../lib/adminAuth';
import { putInventoryItem }   from '../lib/dynamo';
import { InventoryItem }      from '../types/inventory';

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

  const { name, category, quantity, unit, unitCost, minStock, notes, createdAt } = body;

  if (!name || !category || !unit) {
    return json(400, { ok: false, error: { code: 'MISSING_FIELDS', message: 'Campos requeridos: name, category, unit.' } });
  }

  const now = new Date().toISOString();
  const item: InventoryItem = {
    PK:        `INVENTORY#${id}`,
    SK:        'META',
    id,
    name:      String(name).trim(),
    category:  category as InventoryItem['category'],
    quantity:  Number(quantity ?? 0),
    unit:      String(unit).trim(),
    unitCost:  Number(unitCost ?? 0),
    minStock:  Number(minStock ?? 0),
    notes:     notes ? String(notes).trim() : undefined,
    createdAt: createdAt ? String(createdAt) : now,
    updatedAt: now,
  };

  try {
    await putInventoryItem(item);
    const { PK: _pk, SK: _sk, ...pub } = item;
    return json(200, { ok: true, data: pub });
  } catch (err) {
    console.error('[adminUpsertInventoryItem]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al guardar material.', requestId } });
  }
};
