// backend/src/handlers/postQuote.ts
// POST /quotes — registra una nueva solicitud de cotización.

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { nextQuoteReference, putQuote }                   from '../lib/dynamo';
import {
  ApiResponse,
  PROJECT_TYPES,
  ProjectType,
  QuoteCreateInput,
  QuoteCreateResult,
  QuoteItem,
}                                                         from '../types/quote';

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS_ORIGIN = process.env.CLOUDFRONT_DOMAIN
  ? `https://${process.env.CLOUDFRONT_DOMAIN}`
  : '*';

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

// ── Códigos de error ──────────────────────────────────────────────────────────
const ERR = {
  BAD_JSON:   'BAD_JSON',
  VALIDATION: 'VALIDATION_ERROR',
  DYNAMO:     'DYNAMO_WRITE_ERROR',
  UNKNOWN:    'INTERNAL_ERROR',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(status: number, body: ApiResponse): APIGatewayProxyResult {
  return { statusCode: status, headers: HEADERS, body: JSON.stringify(body) };
}

function normalizePhone(raw: string): string {
  // Quita todo lo que no sean dígitos
  return raw.replace(/\D+/g, '');
}

function trim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

interface ValidationIssue { field: string; message: string }

function validate(
  input: Partial<QuoteCreateInput>,
): { ok: true; data: Required<QuoteCreateInput> } | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  const name = trim(input.name);
  if (name.length < 2 || name.length > 120) {
    issues.push({ field: 'name', message: 'Nombre requerido (2–120 caracteres).' });
  }

  const phone = normalizePhone(trim(input.phone));
  if (phone.length < 10 || phone.length > 15) {
    issues.push({ field: 'phone', message: 'Teléfono inválido (10–15 dígitos).' });
  }

  const projectType = trim(input.projectType);
  if (!PROJECT_TYPES.includes(projectType as ProjectType)) {
    issues.push({ field: 'projectType', message: 'Tipo de proyecto no válido.' });
  }

  const description = trim(input.description);
  if (description.length < 5 || description.length > 2000) {
    issues.push({ field: 'description', message: 'Descripción requerida (5–2000 caracteres).' });
  }

  const email = trim(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push({ field: 'email', message: 'Correo inválido.' });
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok:   true,
    data: {
      name,
      phone,
      email,
      address:     trim(input.address),
      projectType,
      description,
      dimensions:  trim(input.dimensions),
      finish:      trim(input.finish),
      material:    trim(input.material),
      visualRef:   trim(input.visualRef),
      budget:      trim(input.budget),
      timeline:    trim(input.timeline),
    },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'local';

  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  // 1. Parse JSON
  let body: Partial<QuoteCreateInput>;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, {
      ok: false,
      error: { code: ERR.BAD_JSON, message: 'JSON inválido.', requestId },
    });
  }

  // 2. Validación
  const v = validate(body);
  if (!v.ok) {
    return json(400, {
      ok: false,
      error: {
        code:      ERR.VALIDATION,
        message:   v.issues.map((i) => `${i.field}: ${i.message}`).join(' · '),
        requestId,
      },
    });
  }

  try {
    // 3. Generar referencia atómica (contador en DynamoDB)
    const reference = await nextQuoteReference();
    const now       = new Date().toISOString();

    const item: QuoteItem = {
      PK:          `QUOTE#${reference}`,
      SK:          'METADATA',
      reference,
      name:        v.data.name,
      phone:       v.data.phone,
      email:       v.data.email,
      address:     v.data.address,
      projectType: v.data.projectType as ProjectType,
      description: v.data.description,
      dimensions:  v.data.dimensions,
      finish:      v.data.finish,
      material:    v.data.material,
      visualRef:   v.data.visualRef,
      budget:      v.data.budget,
      timeline:    v.data.timeline,
      status:      'Abierta',
      createdAt:   now,
      updatedAt:   now,
    };

    // 4. Persistir
    await putQuote(item);

    // 5. Responder con referencia
    const result: QuoteCreateResult = {
      reference,
      status:    item.status,
      createdAt: item.createdAt,
    };

    console.log('[postQuote] ok', { requestId, reference });
    return json(201, { ok: true, data: result });

  } catch (err: unknown) {
    console.error('[postQuote] error', {
      requestId,
      error: err instanceof Error
        ? { message: err.message, name: err.name, stack: err.stack }
        : err,
    });

    const isDynamo = err instanceof Error && err.name.includes('DynamoDB');

    return json(500, {
      ok: false,
      error: {
        code:    isDynamo ? ERR.DYNAMO : ERR.UNKNOWN,
        message: 'No se pudo registrar la cotización. Intenta de nuevo.',
        requestId,
      },
    });
  }
};
