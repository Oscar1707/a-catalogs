// backend/src/handlers/adminUpsertBoard.ts
// PUT /admin/boards/{id} — crea o actualiza un tablero de corte.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { putBoard }     from '../lib/dynamo';
import type { BoardItem, BoardPublic } from '../types/board';

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

  const id = event.pathParameters?.id ?? '';
  if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id requerido.', requestId } });

  let body: Partial<BoardPublic>;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { ok: false, error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId } });
  }

  if (!body.name?.trim()) {
    return json(400, { ok: false, error: { code: 'VALIDATION_ERROR', message: 'name requerido.', requestId } });
  }

  const now = new Date().toISOString();
  const item: BoardItem = {
    PK:          `BOARD#${id}`,
    SK:          'METADATA',
    id,
    name:        body.name.trim(),
    createdAt:   body.createdAt ?? now,
    updatedAt:   now,
    material:    body.material ?? 'mdf',
    boardWidth:  body.boardWidth  ?? 0,
    boardLength: body.boardLength ?? 0,
    kerfMm:      body.kerfMm      ?? 3,
    cuts:        body.cuts        ?? [],
    placed:      body.placed      ?? [],
    unplaced:    body.unplaced    ?? [],
    remnants:    body.remnants    ?? [],
    source:      body.source      ?? { kind: 'new' },
  };

  try {
    await putBoard(item);
    const { PK: _pk, SK: _sk, ...pub } = item;
    return json(200, { ok: true, data: pub });
  } catch (err) {
    console.error('[adminUpsertBoard]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al guardar tablero.', requestId } });
  }
};
