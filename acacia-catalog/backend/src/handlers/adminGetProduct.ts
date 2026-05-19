// backend/src/handlers/adminGetProduct.ts
// GET /admin/products/{id} — detalle de un producto para el panel admin.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { getProductById } from '../lib/dynamo';
import { ProductPublic } from '../types/product';
import { ApiResponse }   from '../types/quote';

const CORS_ORIGIN = process.env.ADMIN_CLOUDFRONT_DOMAIN
  ? `https://${process.env.ADMIN_CLOUDFRONT_DOMAIN}`
  : '*';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Cache-Control':                'no-store',
} as const;

function json(status: number, body: ApiResponse): APIGatewayProxyResult {
  return { statusCode: status, headers: HEADERS, body: JSON.stringify(body) };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  const id = (event.pathParameters?.id ?? '').trim();
  if (!id) {
    return json(400, {
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'ID requerido.', requestId },
    });
  }

  try {
    const item = await getProductById(id);
    if (!item) {
      return json(404, {
        ok: false,
        error: {
          code:    'NOT_FOUND',
          message: 'Producto no encontrado.',
          requestId,
        },
      });
    }

    const { PK: _pk, SK: _sk, ...rest } = item;
    return json(200, { ok: true, data: rest as ProductPublic });

  } catch (err: unknown) {
    console.error('[adminGetProduct] error', {
      requestId, id,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'No se pudo cargar el producto.',
        requestId,
      },
    });
  }
};
