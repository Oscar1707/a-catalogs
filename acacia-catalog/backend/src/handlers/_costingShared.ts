// backend/src/handlers/_costingShared.ts
// Helpers compartidos por los handlers de costings:
//   CORS headers, JSON helper, validación de input.

import type { APIGatewayProxyResult } from 'aws-lambda';
import {
  COSTING_CATEGORIES,
  type CostingCategory,
  type CostingCreateInput,
  type CostingItem,
} from '../types/costing';

const CORS_ORIGIN = process.env.ADMIN_CLOUDFRONT_DOMAIN
  ? `https://${process.env.ADMIN_CLOUDFRONT_DOMAIN}`
  : '*';

export const COSTING_HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Cache-Control':                'no-store',
} as const;

export function json(status: number, body: unknown): APIGatewayProxyResult {
  return { statusCode: status, headers: COSTING_HEADERS, body: JSON.stringify(body) };
}

interface ValidationIssue { field: string; message: string }
type ValidationResult =
  | { ok: true;  data: CostingCreateInput }
  | { ok: false; issues: ValidationIssue[] };

function isCategory(v: unknown): v is CostingCategory {
  return typeof v === 'string' && (COSTING_CATEGORIES as string[]).includes(v);
}

function validateItem(raw: unknown, idx: number): { ok: true; item: CostingItem } | { ok: false; message: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, message: `items[${idx}] inválido` };
  }
  const r = raw as Record<string, unknown>;

  const id        = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : null;
  const name      = typeof r.name === 'string' ? r.name.trim() : '';
  const category  = isCategory(r.category) ? r.category : null;
  const qty       = Number(r.qty);
  const unitPrice = Number(r.unitPrice);
  const unit      = typeof r.unit === 'string' ? r.unit.trim() : undefined;

  if (!id)                     return { ok: false, message: `items[${idx}].id requerido` };
  if (!name)                   return { ok: false, message: `items[${idx}].name requerido` };
  if (!category)               return { ok: false, message: `items[${idx}].category inválida` };
  if (!Number.isFinite(qty) || qty < 0)
    return { ok: false, message: `items[${idx}].qty inválido` };
  if (!Number.isFinite(unitPrice) || unitPrice < 0)
    return { ok: false, message: `items[${idx}].unitPrice inválido` };

  return { ok: true, item: { id, name, category, qty, unitPrice, unit } };
}

export function validateCosting(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!input || typeof input !== 'object') {
    return { ok: false, issues: [{ field: 'body', message: 'JSON inválido' }] };
  }
  const b = input as Record<string, unknown>;

  const productName = typeof b.productName === 'string' ? b.productName.trim() : '';
  if (productName.length < 1 || productName.length > 80) {
    issues.push({ field: 'productName', message: 'Nombre del producto requerido (1-80 chars).' });
  }

  const productId = typeof b.productId === 'string' && b.productId.trim()
    ? b.productId.trim() : undefined;

  const notes = typeof b.notes === 'string' && b.notes.trim()
    ? b.notes.trim() : undefined;

  const marginPct = Number(b.marginPct ?? 0);
  if (!Number.isFinite(marginPct) || marginPct < 0 || marginPct > 1000) {
    issues.push({ field: 'marginPct', message: 'Margen inválido (0-1000).' });
  }

  const ivaIncluded = b.ivaIncluded === true;

  const itemsRaw = Array.isArray(b.items) ? b.items : null;
  if (!itemsRaw) {
    issues.push({ field: 'items', message: 'items debe ser un arreglo.' });
  }

  const items: CostingItem[] = [];
  if (itemsRaw) {
    for (let i = 0; i < itemsRaw.length; i++) {
      const v = validateItem(itemsRaw[i], i);
      if (!v.ok) issues.push({ field: `items[${i}]`, message: v.message });
      else items.push(v.item);
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    data: { productName, productId, notes, items, marginPct, ivaIncluded },
  };
}
