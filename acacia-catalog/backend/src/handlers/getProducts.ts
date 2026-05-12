// backend/src/handlers/getProducts.ts
// GET /products — devuelve todos los productos activos agrupados por family.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { scanActiveProducts }                             from '../lib/dynamo';
import { ProductPublic, ProductsByFamily, ApiResponse }  from '../types/product';

// ── CORS ───────────────────────────────────────────────────────────────────────
const CORS_ORIGIN = process.env.CLOUDFRONT_DOMAIN
  ? `https://${process.env.CLOUDFRONT_DOMAIN}`
  : '*';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control':                'public, max-age=60',
} as const;

// ── Códigos de error ───────────────────────────────────────────────────────────
const ERR = {
  DYNAMO:  'DYNAMO_SCAN_ERROR',
  UNKNOWN: 'INTERNAL_ERROR',
} as const;

// ── Helper de respuesta ────────────────────────────────────────────────────────
function json(statusCode: number, body: ApiResponse): APIGatewayProxyResult {
  return {
    statusCode,
    headers: HEADERS,
    body:    JSON.stringify(body),
  };
}

// ── Handler ────────────────────────────────────────────────────────────────────
export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';

  try {
    // 1. Obtener todos los productos activos de DynamoDB
    const items = await scanActiveProducts();

    // 2. Quitar claves internas (PK, SK) y ordenar por campo `order`
    const productos: ProductPublic[] = items
      .map(({ PK: _pk, SK: _sk, ...rest }) => rest as ProductPublic)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    // 3. Agrupar por family
    const grouped: ProductsByFamily = {};
    for (const p of productos) {
      const key = p.family ?? 'Sin categoría';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    }

    // 4. Responder
    return json(200, {
      ok: true,
      data: grouped,
      meta: {
        total:      productos.length,
        categorias: Object.keys(grouped).length,
        generadoEn: new Date().toISOString(),
      },
    });

  } catch (err: unknown) {
    // Loguear detalle completo en CloudWatch — nunca al cliente
    console.error('[getProducts] error', {
      requestId,
      error: err instanceof Error
        ? { message: err.message, stack: err.stack }
        : err,
    });

    const isDynamo = err instanceof Error && err.name.includes('DynamoDB');

    return json(500, {
      ok: false,
      error: {
        code:    isDynamo ? ERR.DYNAMO : ERR.UNKNOWN,
        message: isDynamo
          ? 'No se pudo obtener el catálogo. Intenta de nuevo.'
          : 'Error interno del servidor.',
        requestId,
      },
    });
  }
};
