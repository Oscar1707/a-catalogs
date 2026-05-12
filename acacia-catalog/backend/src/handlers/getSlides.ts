// backend/src/handlers/getSlides.ts
// GET /slides — devuelve los slides activos del carrusel de Home.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { scanActiveSlides }                               from '../lib/dynamo';
import { SlidePublic }                                    from '../types/slide';
import { ApiResponse }                                    from '../types/quote';

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS_ORIGIN = process.env.CLOUDFRONT_DOMAIN
  ? `https://${process.env.CLOUDFRONT_DOMAIN}`
  : '*';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  // Los slides cambian poco — 5 min de cache de borde está OK.
  'Cache-Control':                'public, max-age=300',
} as const;

// ── Códigos de error ──────────────────────────────────────────────────────────
const ERR = {
  DYNAMO:  'DYNAMO_SCAN_ERROR',
  UNKNOWN: 'INTERNAL_ERROR',
} as const;

function json(status: number, body: ApiResponse): APIGatewayProxyResult {
  return { statusCode: status, headers: HEADERS, body: JSON.stringify(body) };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  try {
    const items = await scanActiveSlides();

    // Quitar claves internas — ya están fuera de la proyección, pero por
    // claridad de tipos hacemos el cast explícito.
    const slides: SlidePublic[] = items.map(({ PK: _pk, SK: _sk, ...rest }) =>
      rest as SlidePublic,
    );

    return json(200, {
      ok:   true,
      data: slides,
      meta: { total: slides.length, generadoEn: new Date().toISOString() },
    });

  } catch (err: unknown) {
    console.error('[getSlides] error', {
      requestId,
      error: err instanceof Error
        ? { message: err.message, name: err.name }
        : err,
    });

    const isDynamo = err instanceof Error && err.name.includes('DynamoDB');

    return json(500, {
      ok: false,
      error: {
        code:    isDynamo ? ERR.DYNAMO : ERR.UNKNOWN,
        message: 'No se pudieron cargar los slides.',
        requestId,
      },
    });
  }
};
