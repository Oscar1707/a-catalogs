// backend/src/handlers/postQuote.ts
// POST /quotes — registra una nueva solicitud de cotización y notifica por email.

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
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

// ── SES ───────────────────────────────────────────────────────────────────────
const ses              = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const NOTIFICATION_TO  = process.env.NOTIFICATION_EMAIL ?? '';

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

// ── Email de notificación ─────────────────────────────────────────────────────
async function sendNotificationEmail(item: QuoteItem): Promise<void> {
  if (!NOTIFICATION_TO) {
    console.warn('[postQuote] NOTIFICATION_EMAIL no configurado — omitiendo email.');
    return;
  }

  const row = (label: string, value: string | undefined) =>
    value ? `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px;white-space:nowrap">${label}</td><td style="padding:6px 0;font-size:13px;color:#1a1a18">${value}</td></tr>` : '';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0dfd8;max-width:600px">

        <!-- Header -->
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid #e8e6df">
            <p style="margin:0;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#b08a4e">
              Acacia Woods
            </p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#1a1a18;letter-spacing:-0.01em">
              Nueva solicitud de cotización
            </h1>
          </td>
        </tr>

        <!-- Referencia destacada -->
        <tr>
          <td style="padding:24px 32px;background:#fafaf7;border-bottom:1px solid #e8e6df">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#999">
              Número de referencia
            </p>
            <p style="margin:0;font-size:28px;font-weight:300;color:#1a1a18;letter-spacing:0.05em">
              ${item.reference}
            </p>
            <p style="margin:8px 0 0;font-size:12px;color:#999">
              ${new Date(item.createdAt).toLocaleString('es-MX', {
                dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City',
              })}
            </p>
          </td>
        </tr>

        <!-- Datos de contacto -->
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #e8e6df">
            <p style="margin:0 0 14px;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#b08a4e">
              Contacto
            </p>
            <table cellpadding="0" cellspacing="0">
              ${row('Nombre',    item.name)}
              ${row('Teléfono',  item.phone)}
              ${row('Email',     item.email   || undefined)}
              ${row('Dirección', item.address || undefined)}
            </table>
          </td>
        </tr>

        <!-- Datos del proyecto -->
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #e8e6df">
            <p style="margin:0 0 14px;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#b08a4e">
              Proyecto
            </p>
            <table cellpadding="0" cellspacing="0">
              ${row('Tipo',        item.projectType)}
              ${row('Descripción', item.description)}
              ${row('Dimensiones', item.dimensions || undefined)}
              ${row('Acabado',     item.finish     || undefined)}
              ${row('Material',    item.material   || undefined)}
              ${row('Referencia',  item.visualRef  || undefined)}
              ${row('Presupuesto', item.budget     || undefined)}
              ${row('Plazo',       item.timeline   || undefined)}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px">
            <p style="margin:0;font-size:11px;color:#aaa">
              Acacia Woods · Hecho a mano en México
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `[Acacia Woods] Nueva cotización — ${item.reference}`,
    '',
    `Referencia: ${item.reference}`,
    `Fecha: ${new Date(item.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
    '',
    '── Contacto ──',
    `Nombre:    ${item.name}`,
    `Teléfono:  ${item.phone}`,
    item.email   ? `Email:     ${item.email}`   : '',
    item.address ? `Dirección: ${item.address}` : '',
    '',
    '── Proyecto ──',
    `Tipo:        ${item.projectType}`,
    `Descripción: ${item.description}`,
    item.dimensions ? `Dimensiones: ${item.dimensions}` : '',
    item.finish     ? `Acabado:     ${item.finish}`     : '',
    item.material   ? `Material:    ${item.material}`   : '',
    item.visualRef  ? `Referencia:  ${item.visualRef}`  : '',
    item.budget     ? `Presupuesto: ${item.budget}`     : '',
    item.timeline   ? `Plazo:       ${item.timeline}`   : '',
  ].filter((l) => l !== undefined).join('\n');

  await ses.send(new SendEmailCommand({
    Source:      NOTIFICATION_TO,
    Destination: { ToAddresses: [NOTIFICATION_TO] },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data:    `[Acacia Woods] Nueva solicitud — ${item.projectType} · ${item.name}`,
      },
      Body: {
        Html: { Charset: 'UTF-8', Data: html },
        Text: { Charset: 'UTF-8', Data: text },
      },
    },
  }));
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

    // 4. Persistir en DynamoDB
    await putQuote(item);

    // 5. Notificar por email (fire-and-forget: no bloquea la respuesta al cliente)
    sendNotificationEmail(item).catch((err) => {
      console.error('[postQuote] email error (non-fatal)', {
        requestId,
        reference,
        error: err instanceof Error ? err.message : err,
      });
    });

    // 6. Responder con referencia
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
