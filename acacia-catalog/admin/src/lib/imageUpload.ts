// admin/src/lib/imageUpload.ts
// Pipeline de upload de imagen:
//   1. Si no es WebP, convertir vía Canvas (calidad 0.82)
//   2. Redimensionar a max 1600px de ancho/alto (lado largo)
//   3. Pedir presigned URL al backend
//   4. PUT directo a S3
//   5. Devolver la publicUrl para guardar en images[]

import { apiRequest } from '@/lib/apiClient';

export const MAX_DIMENSION = 1600;
export const WEBP_QUALITY  = 0.82;
export const MAX_BYTES     = 5 * 1024 * 1024;

interface PresignResult {
  uploadUrl: string;
  key:       string;
  publicUrl: string;
  expiresIn: number;
}

/**
 * Convierte un File (JPG/PNG/WebP/HEIC) a Blob WebP redimensionado.
 * Si el archivo ya es WebP y cabe en MAX_DIMENSION, retorna el original.
 */
export async function convertToWebP(file: File): Promise<Blob> {
  const bitmap = await loadBitmap(file);

  // ¿Necesita resize?
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
  const w = Math.round(bitmap.width  * scale);
  const h = Math.round(bitmap.height * scale);

  // Si ya es WebP y no requiere resize, devolvemos tal cual
  if (file.type === 'image/webp' && scale === 1) {
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_UNSUPPORTED');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  );

  if (!blob) throw new Error('WEBP_ENCODE_FAILED');
  return blob;
}

/** Carga el File como ImageBitmap (más rápido que <img>) */
async function loadBitmap(file: File): Promise<ImageBitmap> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file);
  }
  // Fallback (Safari < 14)
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => createImageBitmap(img).then(resolve).catch(reject);
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Sube una imagen para el producto.
 * 1. Convierte a WebP (con resize si hace falta).
 * 2. Solicita presigned URL al backend.
 * 3. PUT directo a S3.
 * 4. Devuelve la publicUrl lista para guardar en images[].
 */
export async function uploadProductImage(
  productId: string,
  file:      File,
  onProgress?: (phase: 'converting' | 'requesting' | 'uploading' | 'done') => void,
): Promise<string> {
  onProgress?.('converting');
  const webp = await convertToWebP(file);

  if (webp.size > MAX_BYTES) {
    throw new Error(`Imagen demasiado grande (${(webp.size / 1024 / 1024).toFixed(1)} MB). Máximo 5 MB.`);
  }

  onProgress?.('requesting');
  const presigned = await apiRequest<PresignResult>('/admin/uploads/product-image', {
    method: 'POST',
    body: {
      productId,
      contentType:   'image/webp',
      contentLength: webp.size,
    },
  });

  onProgress?.('uploading');
  const putRes = await fetch(presigned.uploadUrl, {
    method:  'PUT',
    headers: {
      'Content-Type':   'image/webp',
      'Content-Length': String(webp.size),
    },
    body:    webp,
  });

  if (!putRes.ok) {
    throw new Error(`Upload falló (HTTP ${putRes.status}).`);
  }

  onProgress?.('done');
  return presigned.publicUrl;
}
