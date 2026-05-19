// backend/src/handlers/adminAddQuoteNote.ts
// POST /admin/quotes/{reference}/notes — agrega una nota interna.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { addQuoteNote, getQuoteByReference } from '../lib/dynamo';
import { ApiResponse, NotePublic } from '../types/quote';

const CORS_ORIGIN = process.env.ADMIN_CLOUDFRONT_DOMAIN
  ? `https://${process.env.ADMIN_CLOUDFRONT_DOMAIN}`
  : '*';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Cache-Control':                'no-store',
} as const;

const REF_REGEX  = /^ACW-\d{4}-\d{4}$/;
const NOTE_MIN   = 1;
const NOTE_MAX   = 4000;

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
      error: { code: 'BAD_REQUEST', message: 'Referencia inválida.', requestId },
    });
  }

  let text = '';
  try {
    const body = JSON.parse(event.body ?? '{}') as { text?: string };
    text = (body.text ?? '').toString().trim();
  } catch {
    return json(400, {
      ok: false,
      error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId },
    });
  }

  if (text.length < NOTE_MIN || text.length > NOTE_MAX) {
    return json(400, {
      ok: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: `La nota debe tener entre ${NOTE_MIN} y ${NOTE_MAX} caracteres.`,
        requestId,
      },
    });
  }

  try {
    // Validar que la cotización existe antes de crear la nota (evita notas huérfanas)
    const quote = await getQuoteByReference(reference);
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

    const noteItem = await addQuoteNote(reference, text);

    const note: NotePublic = {
      id:        noteItem.id,
      text:      noteItem.text,
      author:    noteItem.author,
      createdAt: noteItem.createdAt,
    };

    console.log('[adminAddQuoteNote] nota agregada', {
      requestId, reference, noteId: note.id,
    });

    return json(201, { ok: true, data: note });

  } catch (err: unknown) {
    console.error('[adminAddQuoteNote] error', {
      requestId, reference,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'No se pudo agregar la nota.',
        requestId,
      },
    });
  }
};
