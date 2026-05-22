// backend/src/handlers/adminGetAnalytics.ts
// GET /admin/analytics  (requiere JWT en Authorization: Bearer <token>)
// Devuelve top productos por vistas + últimas 50 visitas con IP.

import type { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { requireAdmin } from '../lib/adminAuth';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE  = process.env.ANALYTICS_TABLE_NAME!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    // Top productos — Scan filtrando sk=STATS
    const pagesScan = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'sk = :stats',
      ExpressionAttributeValues: { ':stats': 'STATS' },
      ProjectionExpression: 'slug, viewCount, lastSeen',
    }));

    const topProducts = (pagesScan.Items ?? [])
      .map(i => ({ slug: i.slug as string, viewCount: (i.viewCount as number) ?? 0, lastSeen: i.lastSeen as string }))
      .sort((a, b) => b.viewCount - a.viewCount);

    // Últimas 50 visitas — Query pk=VISIT, ScanIndexForward=false
    const visitsQuery = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :v',
      ExpressionAttributeValues: { ':v': 'VISIT' },
      ScanIndexForward: false,
      Limit: 50,
      ProjectionExpression: 'slug, ip, sk',
    }));

    const recentVisits = (visitsQuery.Items ?? []).map(i => ({
      slug:      i.slug as string,
      ip:        i.ip as string,
      visitedAt: (i.sk as string).split('#')[0], // extrae la fecha del sk
    }));

    return json(200, { ok: true, data: { topProducts, recentVisits } });
  } catch (err: unknown) {
    const requestId = event.requestContext?.requestId ?? 'local';
    console.error('[adminGetAnalytics] error', {
      requestId,
      error: err instanceof Error ? { message: err.message, name: err.name } : err,
    });
    return json(500, {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'No se pudieron cargar los analytics.', requestId },
    });
  }
};
