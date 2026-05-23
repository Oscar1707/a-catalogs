// GET /admin/slides — lista todos los slides (activos e inactivos).
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { scanAllSlides } from '../lib/dynamo';
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
  try {
    const slides = await scanAllSlides();
    return json(200, { ok: true, data: slides });
  } catch (err) {
    console.error('[adminListSlides]', err);
    return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error al cargar slides.', requestId } });
  }
};
