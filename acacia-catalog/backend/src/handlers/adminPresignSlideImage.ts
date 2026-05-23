// POST /admin/uploads/slide-image
// Body: { contentType, contentLength }
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { ACCEPTED_CONTENT_TYPES, MAX_IMAGE_BYTES, presignSlideImageUpload } from '../lib/s3';
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

  let input: { contentType?: string; contentLength?: number };
  try { input = JSON.parse(event.body ?? '{}'); } catch {
    return json(400, { ok: false, error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId } });
  }

  const contentType   = (input.contentType ?? '').trim();
  const contentLength = Number(input.contentLength);

  if (!ACCEPTED_CONTENT_TYPES.includes(contentType)) {
    return json(400, { ok: false, error: { code: 'UNSUPPORTED_CONTENT_TYPE', message: 'Solo WebP.', requestId } });
  }
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_IMAGE_BYTES) {
    return json(400, { ok: false, error: { code: 'INVALID_SIZE', message: `Máx ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`, requestId } });
  }

  try {
    const result = await presignSlideImageUpload(contentType, contentLength);
    return json(200, { ok: true, data: { ...result, expiresIn: 300 } });
  } catch (err) {
    console.error('[adminPresignSlideImage]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al generar URL.', requestId } });
  }
};
