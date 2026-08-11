import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';
const requiredInProduction = ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_ORIGIN'];

const asBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const asNumber = (value, fallback) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) throw new Error(`Expected a number, received: ${value}`);
  return parsed;
};

const storageDriver = process.env.STORAGE_DRIVER ?? 'local';
if (!['local', 's3'].includes(storageDriver)) throw new Error('STORAGE_DRIVER must be local or s3');
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || null;
const allowedEmailDomain = process.env.AUTH_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase().replace(/^@/, '') || null;
const passwordAuthEnabled = asBoolean(process.env.PASSWORD_AUTH_ENABLED, true);

if (isProduction) {
  for (const key of requiredInProduction) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters in production');
  if (asBoolean(process.env.METRICS_ENABLED, true) && !process.env.METRICS_TOKEN) {
    throw new Error('METRICS_TOKEN is required when production metrics are enabled');
  }
  if (Boolean(googleClientId) !== Boolean(allowedEmailDomain)) {
    throw new Error('GOOGLE_CLIENT_ID and AUTH_ALLOWED_EMAIL_DOMAIN must be configured together in production');
  }
  if (!passwordAuthEnabled && !googleClientId) {
    throw new Error('At least one production sign-in method must be enabled');
  }
}

if (storageDriver === 's3') {
  for (const key of ['S3_BUCKET', 'S3_REGION']) {
    if (!process.env[key]) throw new Error(`Missing required S3 variable: ${key}`);
  }
  if (Boolean(process.env.S3_ACCESS_KEY_ID) !== Boolean(process.env.S3_SECRET_ACCESS_KEY)) {
    throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be supplied together');
  }
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: asNumber(process.env.PORT, 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/syncspace',
  databaseSslMode: process.env.DATABASE_SSL_MODE ?? (isProduction ? 'verify-full' : 'disable'),
  databaseSslCa: process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n'),
  databasePoolMax: asNumber(process.env.DATABASE_POOL_MAX, 10),
  databaseIdleTimeoutMs: asNumber(process.env.DATABASE_IDLE_TIMEOUT_MS, 30000),
  databaseConnectionTimeoutMs: asNumber(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 5000),
  databaseStatementTimeoutMs: asNumber(process.env.DATABASE_STATEMENT_TIMEOUT_MS, 15000),
  jwtSecret: process.env.JWT_SECRET ?? 'development-only-change-me-please',
  googleClientId,
  allowedEmailDomain,
  passwordAuthEnabled,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',').map((origin) => origin.trim()),
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  defaultCollegeId: asNumber(process.env.DEFAULT_COLLEGE_ID, 1),
  storageDriver,
  s3Bucket: process.env.S3_BUCKET,
  s3Region: process.env.S3_REGION ?? 'us-east-1',
  s3Endpoint: process.env.S3_ENDPOINT,
  s3ForcePathStyle: asBoolean(process.env.S3_FORCE_PATH_STYLE),
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  s3ServerSideEncryption: process.env.S3_SERVER_SIDE_ENCRYPTION ?? 'AES256',
  s3PresignExpiresSeconds: asNumber(process.env.S3_PRESIGN_EXPIRES_SECONDS, 300),
  trustProxy: asBoolean(process.env.TRUST_PROXY, isProduction),
  logLevel: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  metricsEnabled: asBoolean(process.env.METRICS_ENABLED, isProduction),
  metricsToken: process.env.METRICS_TOKEN,
  rateLimitWindowMs: asNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: asNumber(process.env.RATE_LIMIT_MAX, 300),
  authRateLimitMax: asNumber(process.env.AUTH_RATE_LIMIT_MAX, 30),
  shutdownTimeoutMs: asNumber(process.env.SHUTDOWN_TIMEOUT_MS, 10000)
});
