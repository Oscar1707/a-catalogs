// backend/src/handlers/adminListProducts.ts
// GET /admin/products — listado completo (incluye inactivos) para el panel.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { scanAllProducts } from '../lib/dynamo';
import { ProductPublic }  from '../types/product';
import { ApiResponse }    from '../types/quote';

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

  try {
    const items = await scanAllProducts();
    const products: ProductPublic[] = items.map(
      ({ PK: _pk, SK: _sk, ...rest }) => rest as ProductPublic,
    );

    return json(200, {
      ok:   true,
      data: products,
      meta: {
        total:    products.length,
        active:   products.filter((p) => p.active).length,
        featured: products.filter((p) => p.featured).length,
      },
    });

  } catch (err: unknown) {
    console.error('[adminListProducts] error', {
      requestId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'No se pudieron cargar los productos.',
        requestId,
      },
    });
  }
};
