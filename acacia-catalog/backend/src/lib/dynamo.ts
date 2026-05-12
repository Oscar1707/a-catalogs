// backend/src/lib/dynamo.ts
// Cliente DynamoDB singleton — instanciado fuera del handler para
// reutilizarse entre invocaciones del mismo contenedor Lambda.

import { DynamoDBClient }                                    from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
}                                                            from '@aws-sdk/lib-dynamodb';
import { ProductItem }                                       from '../types/product';
import { QuoteItem }                                         from '../types/quote';
import { SlideItem }                                         from '../types/slide';

// ── Cliente singleton ──────────────────────────────────────────────────────────
const raw = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

export const dynamo = DynamoDBDocumentClient.from(raw, {
  marshallOptions:   { removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
});

export const TABLE        = process.env.TABLE_NAME!;
export const QUOTES_TABLE = process.env.QUOTES_TABLE_NAME!;

// ── Atributos reservados en DynamoDB ──────────────────────────────────────────
// Siempre incluir en queries/scans que proyecten estos campos
export const EXPR_NAMES: Record<string, string> = {
  '#name':   'name',
  '#ref':    'ref',
  '#order':  'order',
  '#family': 'family',
};

// ── Proyección estándar de producto (todos los campos públicos) ───────────────
export const PRODUCT_PROJECTION = [
  'id', '#name', '#ref', '#family', 'linea', 'slug', 'skuRef',
  'description', 'tagline', 'categoria',
  'specs', 'materialPrincipal', 'acabado', 'iluminacion', 'instalacion',
  'tallaBase', 'tallas', 'prices',
  'images', 'coverImage',
  'whatsappNumber', 'whatsappMessage',
  'active', '#order', 'createdAt', 'updatedAt',
].join(', ');

// ── scanActiveProducts ────────────────────────────────────────────────────────
// Devuelve todos los productos con active = true.
// Maneja paginación automáticamente con LastEvaluatedKey.
export async function scanActiveProducts(): Promise<ProductItem[]> {
  const items: ProductItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await dynamo.send(new ScanCommand({
      TableName:                 TABLE,
      FilterExpression:          'active = :active AND begins_with(PK, :prefix)',
      ExpressionAttributeValues: {
        ':active': true,
        ':prefix': 'PRODUCT#',
      },
      ProjectionExpression:      PRODUCT_PROJECTION,
      ExpressionAttributeNames:  EXPR_NAMES,
      ExclusiveStartKey:         lastKey,
    }));

    items.push(...((res.Items ?? []) as ProductItem[]));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;

  } while (lastKey);

  return items;
}

// ── getProductById ────────────────────────────────────────────────────────────
// Para futuro endpoint GET /products/{id}
export async function getProductById(id: string): Promise<ProductItem | null> {
  const res = await dynamo.send(new GetCommand({
    TableName:                TABLE,
    Key:                      { PK: `PRODUCT#${id.toLowerCase()}`, SK: 'METADATA' },
    ProjectionExpression:     PRODUCT_PROJECTION,
    ExpressionAttributeNames: EXPR_NAMES,
  }));

  return (res.Item as ProductItem) ?? null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  SLIDES — items del carrusel (tabla acacia-products, prefijo PK: SLIDE#)
// ═════════════════════════════════════════════════════════════════════════════

// Proyección de slide. `#order` está en EXPR_NAMES (reservada).
const SLIDE_PROJECTION = [
  'id', '#type', 'title', 'subtitle', 'image',
  'ctaLabel', 'ctaTarget',
  'active', '#order',
].join(', ');

// Solo declarar los names usados en la proyección — DynamoDB valida
// que cada nombre declarado se use en alguna expresión.
const SLIDE_EXPR_NAMES: Record<string, string> = {
  '#order': 'order', // reservado
  '#type':  'type',  // reservado
};

// ── scanActiveSlides ─────────────────────────────────────────────────────────
// Devuelve todos los slides activos, ordenados por `order` ascendente.
export async function scanActiveSlides(): Promise<SlideItem[]> {
  const items: SlideItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await dynamo.send(new ScanCommand({
      TableName:                 TABLE,
      FilterExpression:          'active = :active AND begins_with(PK, :prefix)',
      ExpressionAttributeValues: {
        ':active': true,
        ':prefix': 'SLIDE#',
      },
      ProjectionExpression:      SLIDE_PROJECTION,
      ExpressionAttributeNames:  SLIDE_EXPR_NAMES,
      ExclusiveStartKey:         lastKey,
    }));

    items.push(...((res.Items ?? []) as SlideItem[]));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

// ═════════════════════════════════════════════════════════════════════════════
//  COTIZACIONES — operaciones sobre QUOTES_TABLE (acacia-quotes)
// ═════════════════════════════════════════════════════════════════════════════

// ── nextQuoteReference ────────────────────────────────────────────────────────
// Contador atómico por año. Garantiza referencias únicas y secuenciales
// usando UpdateItem con ADD — es atómico a nivel item en DynamoDB.
//
// Formato: ACW-{year}-{seq:0000}  → ej. ACW-2026-0042
export async function nextQuoteReference(): Promise<string> {
  const year = String(new Date().getUTCFullYear());

  const res = await dynamo.send(new UpdateCommand({
    TableName:                 QUOTES_TABLE,
    Key:                       { PK: 'COUNTER#QUOTES', SK: year },
    UpdateExpression:          'ADD #v :one',
    ExpressionAttributeNames:  { '#v': 'value' },
    ExpressionAttributeValues: { ':one': 1 },
    ReturnValues:              'UPDATED_NEW',
  }));

  const seq = Number(res.Attributes?.value ?? 0);
  if (!Number.isFinite(seq) || seq <= 0) {
    throw new Error('Contador de cotizaciones inválido');
  }

  const padded = String(seq).padStart(4, '0');
  return `ACW-${year}-${padded}`;
}

// ── putQuote ─────────────────────────────────────────────────────────────────
// Inserta una nueva cotización. ConditionExpression previene duplicados
// en caso de una colisión imposible del contador.
export async function putQuote(item: QuoteItem): Promise<void> {
  await dynamo.send(new PutCommand({
    TableName:           QUOTES_TABLE,
    Item:                item,
    ConditionExpression: 'attribute_not_exists(PK)',
  }));
}

// ── getQuoteByReference ──────────────────────────────────────────────────────
// Busca una cotización por referencia. Devuelve null si no existe.
export async function getQuoteByReference(
  reference: string,
): Promise<QuoteItem | null> {
  const res = await dynamo.send(new GetCommand({
    TableName: QUOTES_TABLE,
    Key:       { PK: `QUOTE#${reference}`, SK: 'METADATA' },
  }));

  return (res.Item as QuoteItem) ?? null;
}
