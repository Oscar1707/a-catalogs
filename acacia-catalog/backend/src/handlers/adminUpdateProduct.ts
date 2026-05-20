// backend/src/handlers/adminUpdateProduct.ts
// PATCH /admin/products/{id} — actualiza una whitelist de campos del producto.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { updateProduct } from '../lib/dynamo';
import { ProductPublic, ProductUpdateInput } from '../types/product';
import { ApiResponse } from '../types/quote';

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

// Whitelist exacta — solo se aceptan estas keys del body
const ALLOWED_FIELDS = new Set<keyof ProductUpdateInput>([
  'name', 'tagline', 'description', 'categoria',
  'family', 'linea',
  'materialPrincipal', 'acabado', 'iluminacion', 'instalacion',
  'whatsappMessage',
  'order',
  'active', 'featured',
  'images', 'coverImage',
]);

const MAX_IMAGES = 20;
const IMAGE_URL_REGEX = /^https:\/\/acacia-catalog-images\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com\/[a-z0-9][a-z0-9-]*\/[a-z0-9]+\.webp$/i;

// Validaciones simples por tipo
function sanitize(body: Record<string, unknown>): {
  ok: true;  data: ProductUpdateInput;
} | {
  ok: false; message: string;
} {
  const out: ProductUpdateInput = {};

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(key as keyof ProductUpdateInput)) continue;

    switch (key) {
      case 'active':
      case 'featured':
        if (typeof value !== 'boolean') {
          return { ok: false, message: `Campo ${key} debe ser boolean.` };
        }
        (out as Record<string, unknown>)[key] = value;
        break;

      case 'order':
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
          return { ok: false, message: 'Campo order debe ser número >= 0.' };
        }
        out.order = Math.floor(value);
        break;

      case 'images': {
        if (!Array.isArray(value)) {
          return { ok: false, message: 'Campo images debe ser un array.' };
        }
        if (value.length > MAX_IMAGES) {
          return { ok: false, message: `Máximo ${MAX_IMAGES} imágenes por producto.` };
        }
        const urls: string[] = [];
        for (const u of value) {
          if (typeof u !== 'string' || !IMAGE_URL_REGEX.test(u)) {
            return { ok: false, message: 'URL de imagen inválida (debe ser del bucket acacia-catalog-images y .webp).' };
          }
          urls.push(u);
        }
        out.images = urls;
        // Auto-sync coverImage si no se envió explícitamente
        if (!('coverImage' in body)) {
          out.coverImage = urls[0] ?? '';
        }
        break;
      }

      case 'coverImage':
        if (typeof value !== 'string') {
          return { ok: false, message: 'Campo coverImage debe ser string.' };
        }
        if (value && !IMAGE_URL_REGEX.test(value)) {
          return { ok: false, message: 'URL de coverImage inválida.' };
        }
        out.coverImage = value;
        break;

      default:
        // El resto son strings
        if (typeof value !== 'string') {
          return { ok: false, message: `Campo ${key} debe ser string.` };
        }
        const trimmed = value.trim();
        if (trimmed.length > 5000) {
          return { ok: false, message: `Campo ${key} excede 5000 caracteres.` };
        }
        (out as Record<string, unknown>)[key] = trimmed;
        break;
    }
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, message: 'No se enviaron campos editables.' };
  }

  return { ok: true, data: out };
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

  const id = (event.pathParameters?.id ?? '').trim();
  if (!id) {
    return json(400, {
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'ID requerido.', requestId },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, {
      ok: false,
      error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId },
    });
  }

  const v = sanitize(body);
  if (!v.ok) {
    return json(400, {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: v.message, requestId },
    });
  }

  try {
    const updated = await updateProduct(id, v.data);
    const { PK: _pk, SK: _sk, ...rest } = updated;

    console.log('[adminUpdateProduct] actualizado', {
      requestId, id, fields: Object.keys(v.data),
    });

    return json(200, { ok: true, data: rest as ProductPublic });

  } catch (err: unknown) {
    const isNotFound = err instanceof Error &&
      err.name === 'ConditionalCheckFailedException';

    if (isNotFound) {
      return json(404, {
        ok: false,
        error: {
          code:    'NOT_FOUND',
          message: 'Producto no encontrado.',
          requestId,
        },
      });
    }

    console.error('[adminUpdateProduct] error', {
      requestId, id,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'No se pudo actualizar el producto.',
        requestId,
      },
    });
  }
};
