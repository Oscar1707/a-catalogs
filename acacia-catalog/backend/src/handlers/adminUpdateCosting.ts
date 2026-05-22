// backend/src/handlers/adminUpdateCosting.ts
// PUT /admin/costings/{id} — actualiza un costeo existente.

import type { APIGatewayProxyHandler } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { updateCosting } from '../lib/dynamo';
import { COSTING_HEADERS, json, validateCosting } from './_costingShared';

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: COSTING_HEADERS, body: '' };
  }

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  const id = event.pathParameters?.id?.trim();
  if (!id) {
    return json(400, {
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'ID requerido.', requestId },
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { ok: false, error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId } });
  }

  const v = validateCosting(body);
  if (!v.ok) {
    return json(400, {
      ok: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: v.issues.map((i) => `${i.field}: ${i.message}`).join(' · '),
        requestId,
      },
    });
  }

  try {
    const item = await updateCosting(id, v.data);
    return json(200, { ok: true, data: item });
  } catch (err: unknown) {
    const isMissing = err instanceof Error && err.name === 'ConditionalCheckFailedException';
    if (isMissing) {
      return json(404, {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Costeo no encontrado.', requestId },
      });
    }
    console.error('[adminUpdateCosting] error', {
      requestId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });
    return json(500, {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'No se pudo actualizar el costeo.', requestId },
    });
  }
};
