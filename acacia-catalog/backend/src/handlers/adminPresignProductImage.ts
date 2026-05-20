// backend/src/handlers/adminPresignProductImage.ts
// POST /admin/uploads/product-image
// Body: { productId, contentType, contentLength }
// Returns: { uploadUrl, key, publicUrl, expiresIn }
//
// Genera un presigned PUT URL para que el navegador suba directo a S3
// (sin pasar por Lambda — el límite de 6 MB no aplica).

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { getProductById } from '../lib/dynamo';
import {
  ACCEPTED_CONTENT_TYPES,
  MAX_IMAGE_BYTES,
  presignProductImageUpload,
} from '../lib/s3';
import { ApiResponse } from '../types/quote';

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

interface UploadInput {
  productId:     string;
  contentType:   string;
  contentLength: number;
}

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

  // Parse body
  let input: Partial<UploadInput>;
  try {
    input = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, {
      ok: false,
      error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId },
    });
  }

  const productId   = (input.productId ?? '').toString().trim();
  const contentType = (input.contentType ?? '').toString().trim();
  const length      = Number(input.contentLength);

  if (!productId) {
    return json(400, {
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'productId requerido.', requestId },
    });
  }

  if (!ACCEPTED_CONTENT_TYPES.includes(contentType)) {
    return json(400, {
      ok: false,
      error: {
        code:    'UNSUPPORTED_CONTENT_TYPE',
        message: `Solo aceptamos WebP. Recibido: ${contentType || '(vacío)'}`,
        requestId,
      },
    });
  }

  if (!Number.isFinite(length) || length <= 0 || length > MAX_IMAGE_BYTES) {
    return json(400, {
      ok: false,
      error: {
        code:    'INVALID_SIZE',
        message: `Tamaño inválido. Máximo ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`,
        requestId,
      },
    });
  }

  try {
    // Verifica que el producto exista y obtén su slug para el key S3
    const product = await getProductById(productId);
    if (!product) {
      return json(404, {
        ok: false,
        error: {
          code:    'NOT_FOUND',
          message: 'Producto no encontrado.',
          requestId,
        },
      });
    }

    const result = await presignProductImageUpload(product.slug, contentType, length);

    console.log('[adminPresignProductImage] presigned', {
      requestId, productId, slug: product.slug, key: result.key,
    });

    return json(200, {
      ok:   true,
      data: { ...result, expiresIn: 300 },
    });

  } catch (err: unknown) {
    console.error('[adminPresignProductImage] error', {
      requestId, productId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'No se pudo generar el URL de upload.',
        requestId,
      },
    });
  }
};
