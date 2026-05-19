// admin/src/api/products.ts

import { apiRequest } from '@/lib/apiClient';
import type { ProductPublic, ProductUpdateInput } from '@/types/product';

export async function listProducts(): Promise<ProductPublic[]> {
  return apiRequest<ProductPublic[]>('/admin/products');
}

export async function getProduct(id: string): Promise<ProductPublic> {
  return apiRequest<ProductPublic>(`/admin/products/${encodeURIComponent(id)}`);
}

export async function updateProduct(
  id: string,
  patch: ProductUpdateInput,
): Promise<ProductPublic> {
  return apiRequest<ProductPublic>(
    `/admin/products/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: patch },
  );
}
