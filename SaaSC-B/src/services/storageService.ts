import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';

const s3Enabled = Boolean(config.aws.s3Bucket);
const s3 = new S3Client({
  region: config.aws.region,
  ...(config.aws.accessKeyId && config.aws.secretAccessKey ? { credentials: { accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey } } : {}),
  ...(config.aws.endpoint ? { endpoint: config.aws.endpoint } : {}),
  forcePathStyle: config.aws.forcePathStyle,
});

const MIME_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

export function detectAllowedFile(buffer: Buffer, allowPdf = false) {
  let mime = '';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) mime = 'image/jpeg';
  else if (buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) mime = 'image/png';
  else if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') mime = 'image/webp';
  else if (allowPdf && buffer.subarray(0, 5).toString() === '%PDF-') mime = 'application/pdf';
  if (!mime) throw new Error(allowPdf ? 'Sólo se permiten JPG, PNG, WEBP o PDF.' : 'Sólo se permiten imágenes JPG, PNG o WEBP.');
  return { mime, extension: MIME_EXTENSIONS[mime] };
}

export async function storeFile(buffer: Buffer, condominioId: string, category: string, originalName: string, allowPdf = false) {
  const detected = detectAllowedFile(buffer, allowPdf);
  const key = `condominios/${condominioId}/${category}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${detected.extension}`;
  if (s3Enabled) {
    await s3.send(new PutObjectCommand({ Bucket: config.aws.s3Bucket, Key: key, Body: buffer, ContentType: detected.mime, ServerSideEncryption: 'AES256', Metadata: { condominio: condominioId, categoria: category } }));
    return { key, mime: detected.mime, storage: 'S3' as const, originalName };
  }
  if (config.nodeEnv === 'production') throw new Error('S3 no está configurado para almacenamiento productivo.');
  const localPath = path.resolve('uploads', key);
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, buffer);
  return { key: `uploads/${key}`, mime: detected.mime, storage: 'LOCAL' as const, originalName };
}

export async function storeBackupArtifact(buffer: Buffer, key: string) {
  if (s3Enabled) {
    await s3.send(new PutObjectCommand({ Bucket: config.aws.s3Bucket, Key: key, Body: buffer, ContentType: 'application/octet-stream', ServerSideEncryption: 'AES256' }));
    return { key, storage: 'S3' as const };
  }
  if (config.nodeEnv === 'production') throw new Error('S3 no está configurado para respaldos productivos.');
  return { key, storage: 'LOCAL' as const };
}

export async function getFileAccessUrl(key?: string | null) {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  if (key.startsWith('uploads/')) return `${config.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.aws.s3Bucket, Key: key }), { expiresIn: 900 });
}

export async function deleteStoredFile(key?: string | null) {
  if (!key || key.startsWith('uploads/') || !s3Enabled) return;
  await s3.send(new DeleteObjectCommand({ Bucket: config.aws.s3Bucket, Key: key }));
}

export function isFileKeyOwnedByCondominium(key: string, condominioId: string) {
  return key.startsWith(`condominios/${condominioId}/`) || key.startsWith(`uploads/condominios/${condominioId}/`);
}
