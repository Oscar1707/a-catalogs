// PUT /admin/slides/{id}
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { putSlide } from '../lib/dynamo';
import { SlideItem, SLIDE_TYPES } from '../types/slide';
import { ApiResponse } from '../types/quote';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};
function json(s: number, b: ApiResponse): APIGatewayProxyResult {
  return { statusCode: s, headers: CORS_HEADERS, body: JSON.stringify(b) };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  const id = event.pathParameters?.id ?? '';
  if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id requerido.', requestId } });

  let body: Partial<SlideItem>;
  try { body = JSON.parse(event.body ?? '{}'); } catch {
    return json(400, { ok: false, error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId } });
  }

  const type = body.type ?? 'promo';
  if (!SLIDE_TYPES.includes(type as typeof SLIDE_TYPES[number])) {
    return json(400, { ok: false, error: { code: 'VALIDATION_ERROR', message: 'type inválido.', requestId } });
  }

  const item: SlideItem = {
    PK:        `SLIDE#${id}`,
    SK:        'METADATA',
    id,
    type:      type as typeof SLIDE_TYPES[number],
    title:     (body.title ?? '').trim(),
    subtitle:  (body.subtitle ?? '').trim(),
    image:     (body.image ?? '').trim(),
    ctaLabel:  (body.ctaLabel ?? '').trim(),
    ctaTarget: (body.ctaTarget ?? '').trim(),
    active:    body.active ?? false,
    order:     typeof body.order === 'number' ? body.order : 99,
  };

  try {
    await putSlide(item);
    return json(200, { ok: true, data: item });
  } catch (err) {
    console.error('[adminUpsertSlide]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al guardar slide.', requestId } });
  }
};
