// backend/src/handlers/adminCreateCosting.ts
// POST /admin/costings — crea un nuevo costeo.

import type { APIGatewayProxyHandler } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { createCosting } from '../lib/dynamo';
import { COSTING_HEADERS, json, validateCosting } from './_costingShared';

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: COSTING_HEADERS, body: '' };
  }

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

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
    const item = await createCosting(v.data);
    console.log('[adminCreateCosting] creado', { requestId, id: item.id, productName: item.productName });
    return json(201, { ok: true, data: item });
  } catch (err: unknown) {
    console.error('[adminCreateCosting] error', {
      requestId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });
    return json(500, {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'No se pudo crear el costeo.', requestId },
    });
  }
};
