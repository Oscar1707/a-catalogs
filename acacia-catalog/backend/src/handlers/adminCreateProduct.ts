// backend/src/handlers/adminCreateProduct.ts
// POST /admin/products — crea un producto nuevo con campos mínimos.
// Defaults sensatos para los campos no enviados; lo demás se edita después.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { requireAdmin } from '../lib/adminAuth';
import { createProduct } from '../lib/dynamo';
import { ProductCreateInput, ProductPublic } from '../types/product';
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

// Formatos aceptados
const ID_REGEX   = /^[A-Z][A-Z0-9-]{2,49}$/;   // ej. ACA-MES-005 (3-50 chars uppercase + dígitos + guiones)
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,79})$/; // ej. mesa-folse (1-80 chars lowercase)

function json(status: number, body: ApiResponse): APIGatewayProxyResult {
  return { statusCode: status, headers: HEADERS, body: JSON.stringify(body) };
}

interface ValidationIssue { field: string; message: string }

function validate(input: Partial<ProductCreateInput>): {
  ok: true;  data: ProductCreateInput;
} | {
  ok: false; issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  const id = (input.id ?? '').toUpperCase().trim();
  if (!ID_REGEX.test(id)) {
    issues.push({ field: 'id', message: 'ID inválido (formato esperado: ACA-XXX-000, mayúsculas/dígitos/guiones, 3-50 chars).' });
  }

  const slug = (input.slug ?? '').toLowerCase().trim();
  if (!SLUG_REGEX.test(slug)) {
    issues.push({ field: 'slug', message: 'Slug inválido (minúsculas, dígitos y guiones, 1-80 chars).' });
  }

  const name = (input.name ?? '').trim();
  if (name.length < 2 || name.length > 120) {
    issues.push({ field: 'name', message: 'Nombre requerido (2-120 caracteres).' });
  }

  const family = (input.family ?? '').trim();
  if (family.length < 1 || family.length > 80) {
    issues.push({ field: 'family', message: 'Familia requerida (1-80 caracteres).' });
  }

  const ref = (input.ref ?? '').trim() || id;

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    data: {
      id,
      ref,
      slug,
      name,
      family,
      linea:           (input.linea           ?? '').toString().trim(),
      categoria:       (input.categoria       ?? '').toString().trim(),
      tagline:         (input.tagline         ?? '').toString().trim(),
      description:     (input.description     ?? '').toString().trim(),
      whatsappNumber:  (input.whatsappNumber  ?? '').toString().trim() || undefined,
      whatsappMessage: (input.whatsappMessage ?? '').toString().trim() || undefined,
    },
  };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  let body: Partial<ProductCreateInput>;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, {
      ok: false,
      error: { code: 'BAD_JSON', message: 'JSON inválido.', requestId },
    });
  }

  const v = validate(body);
  if (!v.ok) {
    return json(400, {
      ok: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: v.issues.map((i) => `${i.field}: ${i.message}`).join(' · '),
        requestId,
      },
    });
  }

  try {
    const item = await createProduct(v.data);
    const { PK: _pk, SK: _sk, ...rest } = item;

    console.log('[adminCreateProduct] creado', {
      requestId, id: item.id, slug: item.slug,
    });

    return json(201, { ok: true, data: rest as ProductPublic });

  } catch (err: unknown) {
    const isDuplicate = err instanceof Error &&
      err.name === 'ConditionalCheckFailedException';

    if (isDuplicate) {
      return json(409, {
        ok: false,
        error: {
          code:    'DUPLICATE',
          message: 'Ya existe un producto con ese ID.',
          requestId,
        },
      });
    }

    console.error('[adminCreateProduct] error', {
      requestId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    return json(500, {
      ok: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: 'No se pudo crear el producto.',
        requestId,
      },
    });
  }
};
