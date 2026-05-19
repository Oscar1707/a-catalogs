// backend/src/handlers/adminGetQuote.ts
// GET /admin/quotes/{reference} — detalle completo + notas internas.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { getQuoteByReference, getQuoteNotes } from '../lib/dynamo';
import {
  ApiResponse,
  NotePublic,
  QuoteAdminDetail,
} from '../types/quote';

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

  try {
    // En paralelo para minimizar latencia
    const [quote, noteItems] = await Promise.all([
      getQuoteByReference(reference),
      getQuoteNotes(reference),
    ]);

    if (!quote) {
      return json(404, {
        ok: false,
        error: {
          code:    'NOT_FOUND',
          message: 'Cotización no encontrada.',
          requestId,
        },
      });
    }

    const notes: NotePublic[] = noteItems.map((n) => ({
      id:        n.id,
      text:      n.text,
      author:    n.author,
      createdAt: n.createdAt,
    }));

    const detail: QuoteAdminDetail = {
      reference:   quote.reference,
      name:        quote.name,
      phone:       quote.phone,
      email:       quote.email,
      address:     quote.address,
      projectType: quote.projectType,
      description: quote.description,
      dimensions:  quote.dimensions,
      finish:      quote.finish,
      material:    quote.material,
      visualRef:   quote.visualRef,
      budget:      quote.budget,
      timeline:    quote.timeline,
      status:      quote.status,
      createdAt:   quote.createdAt,
      updatedAt:   quote.updatedAt,
      notes,
    };

    return json(200, { ok: true, data: detail });

  } catch (err: unknown) {
    console.error('[adminGetQuote] error', {
      requestId,
      reference,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'No se pudo cargar la cotización.',
        requestId,
      },
    });
  }
};
