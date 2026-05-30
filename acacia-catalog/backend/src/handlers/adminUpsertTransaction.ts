// backend/src/handlers/adminUpsertTransaction.ts
// PUT /admin/transactions/{id} — crea o actualiza un movimiento financiero.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin }     from '../lib/adminAuth';
import { putTransaction }   from '../lib/dynamo';
import { TransactionItem }  from '../types/finance';

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

  const { type, amount, concept, category, date, note, quoteReference, createdAt } = body;

  if (!type || !amount || !concept || !category || !date) {
    return json(400, { ok: false, error: { code: 'MISSING_FIELDS', message: 'Campos requeridos: type, amount, concept, category, date.' } });
  }

  const now = new Date().toISOString();
  const item: TransactionItem = {
    PK:              `TRANSACTION#${id}`,
    SK:              'META',
    id,
    type:            type as TransactionItem['type'],
    amount:          Number(amount),
    concept:         String(concept).trim(),
    category:        category as TransactionItem['category'],
    date:            String(date),
    note:            note ? String(note).trim() : undefined,
    quoteReference:  quoteReference ? String(quoteReference).trim() : undefined,
    createdAt:       createdAt ? String(createdAt) : now,
    updatedAt:       now,
  };

  try {
    await putTransaction(item);
    const { PK: _pk, SK: _sk, ...pub } = item;
    return json(200, { ok: true, data: pub });
  } catch (err) {
    console.error('[adminUpsertTransaction]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al guardar transacción.', requestId } });
  }
};
