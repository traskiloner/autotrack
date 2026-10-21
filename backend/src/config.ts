import crypto from 'crypto';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

/** Insecure placeholder used by old docker-compose defaults; never accepted as a real secret. */
export const LEGACY_DEFAULT_JWT_SECRET = 'super_secret_key_change_me_123';

const isUsableSecret = (v?: string) => !!v && v.trim() !== '' && v !== LEGACY_DEFAULT_JWT_SECRET;

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5001),
  /**
   * Express "trust proxy" setting. By default trusts private/loopback hops (Docker network,
   * Nginx, LAN reverse proxies) so req.ip is the real client IP.
   */
  trustProxy: process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal',
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    'https://autotrack.traskiloner.com,http://localhost:4080,http://localhost:5173,http://localhost,https://localhost,capacitor://localhost'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 365),
  /** Lifetime of signed document URLs, in seconds. */
  fileUrlTtlSeconds: Number(process.env.FILE_URL_TTL_SECONDS || 15 * 60),
};

/**
 * Runtime secrets. They are resolved at startup by `loadSecrets()`:
 *  1. If provided via environment variable (and not the insecure legacy default) → used as is.
 *  2. Otherwise read from the `app_settings` table.
 *  3. Otherwise generated randomly and persisted in `app_settings`, so they survive restarts
 *     and redeploys without any manual step.
 */
export const secrets = {
  jwt: '',
  files: '',
  /**
   * Secret that signed the old JWT refresh tokens (before opaque refresh tokens were introduced).
   * Only set when a real JWT_SECRET was configured, so tokens signed with the public default
   * secret are never accepted.
   */
  legacyRefresh: null as string | null,
};

interface SettingsStore {
  get(key: string): Promise<string | null>;
  /** Inserts the value if the key does not exist and returns the stored value (handles races). */
  setIfAbsent(key: string, value: string): Promise<string>;
}

async function resolveSecret(store: SettingsStore, key: string, envValue?: string): Promise<string> {
  if (isUsableSecret(envValue)) return envValue!;
  const existing = await store.get(key);
  if (existing) return existing;
  const generated = crypto.randomBytes(64).toString('base64url');
  const stored = await store.setIfAbsent(key, generated);
  logger.info({ key }, 'Generated and persisted a new random secret');
  return stored;
}

export async function loadSecrets(store: SettingsStore) {
  if (process.env.JWT_SECRET === LEGACY_DEFAULT_JWT_SECRET) {
    logger.warn('JWT_SECRET uses the insecure default value; ignoring it and using an auto-generated secret');
  }
  secrets.jwt = await resolveSecret(store, 'jwt_secret', process.env.JWT_SECRET);
  secrets.files = await resolveSecret(store, 'file_signing_secret', process.env.FILE_SIGNING_SECRET);

  if (isUsableSecret(process.env.JWT_SECRET)) {
    secrets.legacyRefresh = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
  }
}

/** For tests only. */
export function setSecretsForTesting(values: Partial<typeof secrets>) {
  Object.assign(secrets, values);
}
