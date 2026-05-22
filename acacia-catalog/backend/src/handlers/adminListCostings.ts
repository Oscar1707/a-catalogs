// backend/src/handlers/adminListCostings.ts
// GET /admin/costings — lista todos los costeos (más reciente primero).

import type { APIGatewayProxyHandler } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { scanAllCostings } from '../lib/dynamo';
import { COSTING_HEADERS, json } from './_costingShared';

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: COSTING_HEADERS, body: '' };
  }

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const items = await scanAllCostings();
    return json(200, { ok: true, data: items, meta: { total: items.length } });
  } catch (err: unknown) {
    console.error('[adminListCostings] error', {
      requestId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });
    return json(500, {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'No se pudieron cargar los costeos.', requestId },
    });
  }
};
