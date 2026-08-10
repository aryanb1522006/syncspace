import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAdapter } from '../src/services/storage.js';

const config = {
  storageDriver: 's3',
  s3Bucket: 'syncspace-private',
  s3Region: 'auto',
  s3Endpoint: 'https://objects.example.test',
  s3ForcePathStyle: true,
  s3AccessKeyId: 'test-key',
  s3SecretAccessKey: 'test-secret',
  s3ServerSideEncryption: 'AES256',
  s3PresignExpiresSeconds: 120
};

test('S3 storage uploads private PDFs and returns a private reference', async () => {
  const commands = [];
  const adapter = createStorageAdapter(config, {
    s3Client: { send: async (command) => commands.push(command) },
    presign: async () => 'https://signed.example.test/resume'
  });
  const file = { buffer: Buffer.from('%PDF test'), originalname: 'Aryan resume.pdf' };

  assert.equal(await adapter.readUpload(file), file.buffer);
  const reference = await adapter.saveUpload(file);

  assert.match(reference, /^s3:\/\/syncspace-private\/resumes\/.+\.pdf$/);
  assert.equal(commands[0].constructor.name, 'PutObjectCommand');
  assert.equal(commands[0].input.ServerSideEncryption, 'AES256');
  assert.equal(commands[0].input.ContentType, 'application/pdf');
});

test('S3 storage signs a short-lived resume download', async () => {
  let captured;
  const adapter = createStorageAdapter(config, {
    s3Client: { send: async () => {} },
    presign: async (client, command, options) => {
      captured = { command, options };
      return 'https://signed.example.test/resume';
    }
  });

  const result = await adapter.resolveDownload('s3://syncspace-private/resumes/profile.pdf');
  assert.deepEqual(result, { type: 'redirect', url: 'https://signed.example.test/resume' });
  assert.equal(captured.command.constructor.name, 'GetObjectCommand');
  assert.equal(captured.options.expiresIn, 120);
});

test('S3 storage rejects references for a different bucket', async () => {
  const adapter = createStorageAdapter(config, {
    s3Client: { send: async () => {} },
    presign: async () => 'unused'
  });
  await assert.rejects(
    () => adapter.resolveDownload('s3://another-bucket/resumes/profile.pdf'),
    /reference is invalid/i
  );
});
