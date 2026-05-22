// backend/src/handlers/trackPageView.ts
// POST /analytics/pageview
// Body: { slug: string }
// Lee la IP del contexto de API Gateway.
// Escribe un contador atómico por slug y un log de visita con TTL 90 días.

import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE  = process.env.ANALYTICS_TABLE_NAME!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler: APIGatewayProxyHandler = async (event) => {
  // Parsear body
  let slug: string | undefined;
  try {
    const body = JSON.parse(event.body ?? '{}');
    slug = typeof body.slug === 'string' ? body.slug.trim() : undefined;
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: 'invalid body' }) };
  }

  if (!slug || slug.length > 100) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: 'slug required' }) };
  }

  const ip = event.requestContext?.identity?.sourceIp ?? 'unknown';
  const ua = event.headers?.['User-Agent'] ?? event.headers?.['user-agent'] ?? '';
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90 días

  await Promise.all([
    // Incrementar contador de vistas del slug
    client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `PAGE#${slug}`, sk: 'STATS' },
      UpdateExpression: 'ADD viewCount :one SET slug = :slug, lastSeen = :now',
      ExpressionAttributeValues: { ':one': 1, ':slug': slug, ':now': now },
    })),
    // Guardar log de visita con TTL
    client.send(new PutCommand({
      TableName: TABLE,
      Item: {
        pk:        'VISIT',
        sk:        `${now}#${slug}#${ip}`,
        slug,
        ip,
        userAgent: ua.slice(0, 200),
        expiresAt: ttl,
      },
    })),
  ]);

  return { statusCode: 204, headers: cors, body: '' };
};
