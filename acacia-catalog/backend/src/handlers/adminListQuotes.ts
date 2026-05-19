// backend/src/handlers/adminListQuotes.ts
// GET /admin/quotes?status=<QuoteStatus>
// Devuelve listado completo (más reciente primero) con datos para tabla.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { scanAllQuotes } from '../lib/dynamo';
import {
  ApiResponse,
  QUOTE_STATUSES,
  QuoteAdminSummary,
  QuoteStatus,
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

  // Filtro opcional por status
  const statusParam = event.queryStringParameters?.status;
  let statusFilter: QuoteStatus | undefined;
  if (statusParam) {
    if (!QUOTE_STATUSES.includes(statusParam as QuoteStatus)) {
      return json(400, {
        ok: false,
        error: {
          code:    'BAD_REQUEST',
          message: 'Status no válido.',
          requestId,
        },
      });
    }
    statusFilter = statusParam as QuoteStatus;
  }

  try {
    const items = await scanAllQuotes(statusFilter);

    const summaries: QuoteAdminSummary[] = items.map((q) => ({
      reference:   q.reference,
      name:        q.name,
      phone:       q.phone,
      email:       q.email,
      projectType: q.projectType,
      status:      q.status,
      createdAt:   q.createdAt,
      updatedAt:   q.updatedAt,
    }));

    return json(200, {
      ok:   true,
      data: summaries,
      meta: { total: summaries.length, status: statusFilter ?? 'all' },
    });

  } catch (err: unknown) {
    console.error('[adminListQuotes] error', {
      requestId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'No se pudieron cargar las cotizaciones.',
        requestId,
      },
    });
  }
};
