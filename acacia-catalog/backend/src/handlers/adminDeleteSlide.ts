// DELETE /admin/slides/{id}
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { deleteSlide } from '../lib/dynamo';
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
  try {
    await deleteSlide(id);
    return json(200, { ok: true, data: { deleted: id } });
  } catch (err) {
    console.error('[adminDeleteSlide]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al eliminar slide.', requestId } });
  }
};
