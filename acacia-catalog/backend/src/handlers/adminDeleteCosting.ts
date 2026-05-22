// backend/src/handlers/adminDeleteCosting.ts
// DELETE /admin/costings/{id}

import type { APIGatewayProxyHandler } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { deleteCosting } from '../lib/dynamo';
import { COSTING_HEADERS, json } from './_costingShared';

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

  try {
    await deleteCosting(id);
    return json(200, { ok: true, data: { id, deleted: true } });
  } catch (err: unknown) {
    const isMissing = err instanceof Error && err.name === 'ConditionalCheckFailedException';
    if (isMissing) {
      return json(404, {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Costeo no encontrado.', requestId },
      });
    }
    console.error('[adminDeleteCosting] error', {
      requestId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });
    return json(500, {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'No se pudo eliminar el costeo.', requestId },
    });
  }
};
