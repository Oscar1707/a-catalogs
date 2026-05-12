// backend/src/handlers/getQuoteStatus.ts
// GET /quotes/{reference}?phone=...
// Devuelve el estatus de una cotización validando referencia + teléfono.
// Si el teléfono no coincide, responde 404 (no leakear la existencia del ref).

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { getQuoteByReference }                            from '../lib/dynamo';
import { ApiResponse, QuoteStatusResult }                 from '../types/quote';

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS_ORIGIN = process.env.CLOUDFRONT_DOMAIN
  ? `https://${process.env.CLOUDFRONT_DOMAIN}`
  : '*';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  // Sin Cache-Control — el estatus cambia
  'Cache-Control':                'no-store',
} as const;

// ── Códigos de error ──────────────────────────────────────────────────────────
const ERR = {
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND:   'NOT_FOUND',
  DYNAMO:      'DYNAMO_READ_ERROR',
  UNKNOWN:     'INTERNAL_ERROR',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
const REF_REGEX = /^ACW-\d{4}-\d{4}$/;

function json(status: number, body: ApiResponse): APIGatewayProxyResult {
  return { statusCode: status, headers: HEADERS, body: JSON.stringify(body) };
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D+/g, '');
}

// ── Handler ───────────────────────────────────────────────────────────────────
export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  // 1. Extraer y validar inputs
  const reference = (event.pathParameters?.reference ?? '').toUpperCase().trim();
  const phoneRaw  = event.queryStringParameters?.phone ?? '';
  const phone     = normalizePhone(phoneRaw);

  if (!REF_REGEX.test(reference)) {
    return json(400, {
      ok: false,
      error: {
        code:    ERR.BAD_REQUEST,
        message: 'Referencia inválida (formato: ACW-YYYY-NNNN).',
        requestId,
      },
    });
  }

  if (phone.length < 10 || phone.length > 15) {
    return json(400, {
      ok: false,
      error: {
        code:    ERR.BAD_REQUEST,
        message: 'Teléfono inválido (10–15 dígitos).',
        requestId,
      },
    });
  }

  try {
    // 2. Buscar la cotización
    const quote = await getQuoteByReference(reference);

    // 3. Devolver 404 si no existe O si el teléfono no coincide.
    //    No diferenciamos para no leakear si la referencia existe.
    if (!quote || quote.phone !== phone) {
      return json(404, {
        ok: false,
        error: {
          code:    ERR.NOT_FOUND,
          message: 'No encontramos una cotización con esos datos.',
          requestId,
        },
      });
    }

    // 4. Responder con los campos públicos del estatus
    const result: QuoteStatusResult = {
      reference:   quote.reference,
      status:      quote.status,
      projectType: quote.projectType,
      createdAt:   quote.createdAt,
      updatedAt:   quote.updatedAt,
    };

    return json(200, { ok: true, data: result });

  } catch (err: unknown) {
    console.error('[getQuoteStatus] error', {
      requestId,
      reference,
      error: err instanceof Error
        ? { message: err.message, name: err.name }
        : err,
    });

    const isDynamo = err instanceof Error && err.name.includes('DynamoDB');

    return json(500, {
      ok: false,
      error: {
        code:    isDynamo ? ERR.DYNAMO : ERR.UNKNOWN,
        message: 'No se pudo consultar la cotización. Intenta de nuevo.',
        requestId,
      },
    });
  }
};
