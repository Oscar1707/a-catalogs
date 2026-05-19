// backend/src/handlers/adminUpdateQuoteStatus.ts
// PATCH /admin/quotes/{reference}/status — cambia el status de una cotización.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { updateQuoteStatus } from '../lib/dynamo';
import {
  ApiResponse,
  QUOTE_STATUSES,
  QuoteStatus,
} from '../types/quote';

const CORS_ORIGIN = process.env.ADMIN_CLOUDFRONT_DOMAIN
  ? `https://${process.env.ADMIN_CLOUDFRONT_DOMAIN}`
  : '*';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Cache-Control':                'no-store',
} as const;

const REF_REGEX = /^ACW-\d{4}-\d{4}$/;

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

  const reference = (event.pathParameters?.reference ?? '').toUpperCase().trim();
  if (!REF_REGEX.test(reference)) {
    return json(400, {
      ok: false,
      error: {
        code:    'BAD_REQUEST',
        message: 'Referencia inválida.',
        requestId,
      },
    });
  }

  let newStatus: QuoteStatus | '';
  try {
    const body = JSON.parse(event.body ?? '{}') as { status?: string };
    newStatus = (body.status ?? '') as QuoteStatus;
  } catch {
    return json(400, {
      ok: false,
      error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId },
    });
  }

  if (!QUOTE_STATUSES.includes(newStatus as QuoteStatus)) {
    return json(400, {
      ok: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: `Status debe ser uno de: ${QUOTE_STATUSES.join(' · ')}`,
        requestId,
      },
    });
  }

  try {
    const updated = await updateQuoteStatus(reference, newStatus as QuoteStatus);

    console.log('[adminUpdateQuoteStatus] status cambiado', {
      requestId, reference, status: newStatus,
    });

    return json(200, {
      ok:   true,
      data: {
        reference: updated.reference,
        status:    updated.status,
        updatedAt: updated.updatedAt,
      },
    });

  } catch (err: unknown) {
    const isNotFound = err instanceof Error &&
      err.name === 'ConditionalCheckFailedException';

    if (isNotFound) {
      return json(404, {
        ok: false,
        error: {
          code:    'NOT_FOUND',
          message: 'Cotización no encontrada.',
          requestId,
        },
      });
    }

    console.error('[adminUpdateQuoteStatus] error', {
      requestId,
      reference,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'No se pudo actualizar el status.',
        requestId,
      },
    });
  }
};
