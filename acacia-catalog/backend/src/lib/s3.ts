// backend/src/lib/s3.ts
// Cliente S3 + generación de URLs presigned para upload directo.
// El upload va del navegador → S3 sin pasar por Lambda (evita el límite 6 MB).

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl }                from '@aws-sdk/s3-request-presigner';
import { randomBytes }                 from 'node:crypto';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const BUCKET = process.env.IMAGES_BUCKET!;

// Singleton fuera del handler para reutilizar entre invocaciones
const s3 = new S3Client({ region: REGION });

// Duración del presigned URL — 5 min es suficiente para subir un WebP de 200KB
const PRESIGN_EXPIRES_SECONDS = 60 * 5;

// Tamaño máximo aceptado (5 MB cubre fotos a 1600x con calidad alta)
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Solo aceptamos WebP — el cliente convierte antes de pedir el presigned URL
export const ACCEPTED_CONTENT_TYPES = ['image/webp'];

export interface PresignedUploadResult {
  /** URL para PUT con el archivo (válida 5 min) */
  uploadUrl: string;
  /** Key dentro del bucket S3 */
  key:       string;
  /** URL pública final, la que va al campo `images[]` del producto */
  publicUrl: string;
}

/**
 * Genera un presigned URL PUT para subir una imagen de producto.
 * Key generado: `<slug>/<8-chars-aleatorios>.webp` — sin colisiones.
 */
export async function presignProductImageUpload(
  slug:        string,
  contentType: string,
  contentLength: number,
): Promise<PresignedUploadResult> {
  if (!ACCEPTED_CONTENT_TYPES.includes(contentType)) {
    throw new Error(`UNSUPPORTED_CONTENT_TYPE:${contentType}`);
  }
  if (contentLength <= 0 || contentLength > MAX_IMAGE_BYTES) {
    throw new Error(`INVALID_SIZE:${contentLength}`);
  }

  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  if (!safeSlug) throw new Error('INVALID_SLUG');

  const randomId = randomBytes(4).toString('hex'); // 8 chars hex
  const key      = `${safeSlug}/${randomId}.webp`;

  const cmd = new PutObjectCommand({
    Bucket:        BUCKET,
    Key:           key,
    ContentType:   contentType,
    ContentLength: contentLength,
    // Cache forever — el hash del nombre garantiza invalidación
    CacheControl:  'public, max-age=31536000, immutable',
  });

  const uploadUrl = await getSignedUrl(s3, cmd, {
    expiresIn:        PRESIGN_EXPIRES_SECONDS,
    // Firma estos headers para que el cliente DEBA mandarlos
    signableHeaders:  new Set(['content-type', 'content-length']),
  });

  const publicUrl = `https://${BUCKET}.s3.amazonaws.com/${key}`;

  return { uploadUrl, key, publicUrl };
}
