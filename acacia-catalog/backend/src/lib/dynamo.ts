// backend/src/lib/dynamo.ts
// Cliente DynamoDB singleton — instanciado fuera del handler para
// reutilizarse entre invocaciones del mismo contenedor Lambda.

import { DynamoDBClient }                                    from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
}                                                            from '@aws-sdk/lib-dynamodb';
import { ProductItem, ProductUpdateInput, ProductCreateInput } from '../types/product';
import { QuoteItem, NoteItem, QuoteStatus }                  from '../types/quote';
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
  'active', 'featured', '#order', 'createdAt', 'updatedAt',
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

// ── scanAllProducts (admin) ──────────────────────────────────────────────────
// Devuelve TODOS los productos (incluyendo inactivos). El listado público
// usa scanActiveProducts; este es solo para el panel admin.
export async function scanAllProducts(): Promise<ProductItem[]> {
  const items: ProductItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await dynamo.send(new ScanCommand({
      TableName:                 TABLE,
      FilterExpression:          'begins_with(PK, :prefix) AND SK = :sk',
      ExpressionAttributeValues: { ':prefix': 'PRODUCT#', ':sk': 'METADATA' },
      ProjectionExpression:      PRODUCT_PROJECTION,
      ExpressionAttributeNames:  EXPR_NAMES,
      ExclusiveStartKey:         lastKey,
    }));

    items.push(...((res.Items ?? []) as ProductItem[]));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

// ── createProduct (admin) ────────────────────────────────────────────────────
// Crea un producto nuevo. Conditional put previene sobrescribir uno existente.
// Auto-asigna `order` al final del catálogo (max + 10) si no se especifica.
export async function createProduct(input: ProductCreateInput): Promise<ProductItem> {
  const id = input.id.trim();
  if (!id) throw new Error('ID requerido');

  // Calcular order: max(order) + 10. Si no hay productos, empieza en 10.
  const existing = await scanAllProducts();
  const maxOrder = existing.reduce((m, p) => Math.max(m, p.order ?? 0), 0);
  const order = maxOrder + 10;

  const now = new Date().toISOString();

  const item: ProductItem = {
    PK:                `PRODUCT#${id.toLowerCase()}`,
    SK:                'METADATA',

    // Identificación
    id,
    name:              input.name.trim(),
    ref:               input.ref.trim() || id,
    family:            input.family.trim(),
    linea:             (input.linea     ?? '').trim(),
    slug:              input.slug.trim().toLowerCase(),
    skuRef:            input.ref.trim() || id,

    // Contenido
    description:       (input.description ?? '').trim(),
    tagline:           (input.tagline     ?? '').trim(),
    categoria:         (input.categoria   ?? '').trim(),

    // Vacíos — se editan después
    specs:             {},
    materialPrincipal: '',
    acabado:           '',
    iluminacion:       '',
    instalacion:       '',
    tallaBase:         '',
    tallas:            {},
    prices:            [],
    images:            [],
    coverImage:        '',

    // WhatsApp
    whatsappNumber:    (input.whatsappNumber  ?? '525639292363').replace(/\D+/g, ''),
    whatsappMessage:   (input.whatsappMessage ?? `Hola, me interesa el modelo ${input.name}.`).trim(),

    // Control
    active:            true,
    featured:          false,
    order,
    createdAt:         now,
    updatedAt:         now,
  };

  await dynamo.send(new PutCommand({
    TableName:           TABLE,
    Item:                item,
    ConditionExpression: 'attribute_not_exists(PK)',
  }));

  return item;
}

// ── updateProduct (admin) ────────────────────────────────────────────────────
// Construye dinámicamente UpdateExpression solo con los campos enviados.
// Maneja palabras reservadas DynamoDB (name, ref, order, family).
// Retorna el item completo actualizado.
const RESERVED_FIELDS = new Set(['name', 'ref', 'order', 'family']);

export async function updateProduct(
  id: string,
  patch: ProductUpdateInput,
): Promise<ProductItem> {
  const sets: string[] = [];
  const exprValues: Record<string, unknown> = {};
  const exprNames: Record<string, string> = {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    // Para reserved words usamos placeholder #foo
    if (RESERVED_FIELDS.has(key)) {
      const nameKey  = `#${key}`;
      const valueKey = `:${key}`;
      exprNames[nameKey]   = key;
      exprValues[valueKey] = value;
      sets.push(`${nameKey} = ${valueKey}`);
    } else {
      const valueKey = `:${key}`;
      exprValues[valueKey] = value;
      sets.push(`${key} = ${valueKey}`);
    }
  }

  // Siempre actualizar updatedAt
  exprValues[':updatedAt'] = new Date().toISOString();
  sets.push('updatedAt = :updatedAt');

  if (sets.length === 1) {
    // Solo updatedAt — no se enviaron campos válidos
    throw new Error('NO_FIELDS_TO_UPDATE');
  }

  const res = await dynamo.send(new UpdateCommand({
    TableName:                 TABLE,
    Key:                       { PK: `PRODUCT#${id.toLowerCase()}`, SK: 'METADATA' },
    UpdateExpression:          `SET ${sets.join(', ')}`,
    ExpressionAttributeValues: exprValues,
    ExpressionAttributeNames:  Object.keys(exprNames).length > 0 ? exprNames : undefined,
    ConditionExpression:       'attribute_exists(PK)',
    ReturnValues:              'ALL_NEW',
  }));

  return res.Attributes as ProductItem;
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

// ── scanAllQuotes (admin) ────────────────────────────────────────────────────
// Devuelve todas las cotizaciones (solo METADATA — no notas).
// Filtro opcional por status. Ordena en memoria por createdAt desc.
//
// Nota MVP: para alto volumen migrar a GSI por status.
export async function scanAllQuotes(
  status?: QuoteStatus,
): Promise<QuoteItem[]> {
  const items: QuoteItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  const filterParts = ['begins_with(PK, :pk)', 'SK = :sk'];
  const exprValues: Record<string, unknown> = {
    ':pk': 'QUOTE#',
    ':sk': 'METADATA',
  };

  if (status) {
    filterParts.push('#st = :status');
    exprValues[':status'] = status;
  }

  do {
    const res = await dynamo.send(new ScanCommand({
      TableName:                 QUOTES_TABLE,
      FilterExpression:          filterParts.join(' AND '),
      ExpressionAttributeValues: exprValues,
      ExpressionAttributeNames:  status ? { '#st': 'status' } : undefined,
      ExclusiveStartKey:         lastKey,
    }));

    items.push(...((res.Items ?? []) as QuoteItem[]));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  // Más reciente primero
  return items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

// ── updateQuoteStatus (admin) ────────────────────────────────────────────────
// Actualiza el status de una cotización + updatedAt. Con ConditionExpression
// para fallar si la referencia no existe.
export async function updateQuoteStatus(
  reference: string,
  status: QuoteStatus,
): Promise<QuoteItem> {
  const now = new Date().toISOString();

  const res = await dynamo.send(new UpdateCommand({
    TableName:                 QUOTES_TABLE,
    Key:                       { PK: `QUOTE#${reference}`, SK: 'METADATA' },
    UpdateExpression:          'SET #st = :s, updatedAt = :u',
    ExpressionAttributeNames:  { '#st': 'status' },
    ExpressionAttributeValues: { ':s': status, ':u': now },
    ConditionExpression:       'attribute_exists(PK)',
    ReturnValues:              'ALL_NEW',
  }));

  return res.Attributes as QuoteItem;
}

// ── getQuoteNotes (admin) ────────────────────────────────────────────────────
// Query por PK con SK begins_with NOTE# — devuelve notas en orden cronológico.
export async function getQuoteNotes(reference: string): Promise<NoteItem[]> {
  const items: NoteItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await dynamo.send(new QueryCommand({
      TableName:                 QUOTES_TABLE,
      KeyConditionExpression:    'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `QUOTE#${reference}`,
        ':sk': 'NOTE#',
      },
      ExclusiveStartKey:         lastKey,
    }));

    items.push(...((res.Items ?? []) as NoteItem[]));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

// ── addQuoteNote (admin) ─────────────────────────────────────────────────────
// Inserta una nueva nota. El timestamp ISO sirve como SK + id.
// Si dos notas se crean en el mismo ms, el segundo recibe sufijo random
// para evitar colisión en SK (extremadamente improbable pero garantizado).
export async function addQuoteNote(
  reference: string,
  text: string,
): Promise<NoteItem> {
  const now = new Date().toISOString();
  // Sufijo random para evitar colisión en SK con notas creadas en el mismo ms
  const suffix = Math.random().toString(36).slice(2, 6);
  const id = `${now}#${suffix}`;

  const item: NoteItem = {
    PK:        `QUOTE#${reference}`,
    SK:        `NOTE#${id}`,
    id,
    text,
    author:    'admin',
    createdAt: now,
  };

  await dynamo.send(new PutCommand({
    TableName:           QUOTES_TABLE,
    Item:                item,
    ConditionExpression: 'attribute_not_exists(SK)',
  }));

  // Actualiza updatedAt en la metadata (sin tocar el status)
  await dynamo.send(new UpdateCommand({
    TableName:                 QUOTES_TABLE,
    Key:                       { PK: `QUOTE#${reference}`, SK: 'METADATA' },
    UpdateExpression:          'SET updatedAt = :u',
    ExpressionAttributeValues: { ':u': now },
    ConditionExpression:       'attribute_exists(PK)',
  })).catch(() => {
    // No es crítico si falla — la nota ya quedó.
    console.warn('[addQuoteNote] no se pudo actualizar updatedAt de metadata');
  });

  return item;
}
