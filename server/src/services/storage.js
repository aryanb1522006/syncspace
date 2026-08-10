import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
if (env.storageDriver === 'local') mkdirSync(uploadRoot, { recursive: true });

const localDiskStorage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadRoot),
  filename: (req, file, callback) => callback(null, `${randomUUID()}.pdf`)
});

export const resumeUpload = multer({
  storage: env.storageDriver === 's3' ? multer.memoryStorage() : localDiskStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (file.mimetype !== 'application/pdf') return callback(new AppError(400, 'Only PDF resumes are accepted'));
    callback(null, true);
  }
});

const s3Reference = (bucket, key) => `s3://${bucket}/${key}`;

const parseS3Reference = (reference, expectedBucket) => {
  let parsed;
  try {
    parsed = new URL(reference);
  } catch {
    throw new AppError(500, 'Stored resume reference is invalid');
  }
  const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (parsed.protocol !== 's3:' || parsed.hostname !== expectedBucket || !key) {
    throw new AppError(500, 'Stored resume reference is invalid');
  }
  return key;
};

export function createStorageAdapter(config = env, dependencies = {}) {
  if (config.storageDriver === 'local') {
    return Object.freeze({
      async readUpload(file) {
        return readFile(file.path);
      },
      async saveUpload(file) {
        return `/uploads/${path.basename(file.path)}`;
      },
      async discardUpload(file) {
        if (file?.path) await unlink(file.path).catch(() => {});
      },
      async deleteReference(reference) {
        if (!reference?.startsWith('/uploads/')) return;
        await unlink(path.join(uploadRoot, path.basename(reference))).catch(() => {});
      },
      async resolveDownload(reference) {
        if (!reference?.startsWith('/uploads/')) throw new AppError(404, 'Resume not found');
        return { type: 'file', path: path.join(uploadRoot, path.basename(reference)) };
      }
    });
  }

  const client = dependencies.s3Client ?? new S3Client({
    region: config.s3Region,
    endpoint: config.s3Endpoint,
    forcePathStyle: config.s3ForcePathStyle,
    credentials: config.s3AccessKeyId ? {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey
    } : undefined
  });
  const presign = dependencies.presign ?? getSignedUrl;

  return Object.freeze({
    async readUpload(file) {
      return file.buffer;
    },
    async saveUpload(file) {
      const key = `resumes/${randomUUID()}.pdf`;
      await client.send(new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: 'application/pdf',
        ...(config.s3ServerSideEncryption && config.s3ServerSideEncryption !== 'none'
          ? { ServerSideEncryption: config.s3ServerSideEncryption }
          : {}),
        Metadata: { originalname: path.basename(file.originalname ?? 'resume.pdf') }
      }));
      return s3Reference(config.s3Bucket, key);
    },
    async discardUpload() {},
    async deleteReference(reference) {
      if (!reference?.startsWith('s3://')) return;
      const key = parseS3Reference(reference, config.s3Bucket);
      await client.send(new DeleteObjectCommand({ Bucket: config.s3Bucket, Key: key }));
    },
    async resolveDownload(reference) {
      const key = parseS3Reference(reference, config.s3Bucket);
      const command = new GetObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: 'inline; filename="resume.pdf"'
      });
      const url = await presign(client, command, { expiresIn: config.s3PresignExpiresSeconds });
      return { type: 'redirect', url };
    }
  });
}

export const storage = createStorageAdapter();
