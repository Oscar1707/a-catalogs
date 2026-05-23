// admin/src/api/slides.ts
import { apiRequest } from '@/lib/apiClient';
import type { SlidePublic } from '@/types/slide';

export function listSlides(): Promise<SlidePublic[]> {
  return apiRequest<SlidePublic[]>('/admin/slides');
}

export function upsertSlide(id: string, data: Omit<SlidePublic, 'id'>): Promise<SlidePublic> {
  return apiRequest<SlidePublic>(`/admin/slides/${id}`, { method: 'PUT', body: { id, ...data } });
}

export function deleteSlide(id: string): Promise<void> {
  return apiRequest<void>(`/admin/slides/${id}`, { method: 'DELETE' });
}

export async function presignSlideImage(file: File): Promise<{ uploadUrl: string; publicUrl: string }> {
  return apiRequest<{ uploadUrl: string; publicUrl: string }>('/admin/uploads/slide-image', {
    method: 'POST',
    body: { contentType: file.type, contentLength: file.size },
  });
}

export async function uploadSlideImage(file: File): Promise<string> {
  const { uploadUrl, publicUrl } = await presignSlideImage(file);
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type, 'Content-Length': String(file.size) },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload falló: HTTP ${res.status}`);
  return publicUrl;
}
