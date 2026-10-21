import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger';
import { loadSecrets } from '../config';

dotenv.config();

const execAsync = promisify(exec);

// Build connection string dynamically if not present
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres_pass';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'autotrack';
  connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;
}
process.env.DATABASE_URL = connectionString;

const pool = new Pool({
  connectionString: connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Automates schema migrations cleanly without manual steps:
 * 1. Checks if database is an existing un-migrated DB (has `users` table but no `_prisma_migrations` entry).
 * 2. Baselines 0_init if needed.
 * 3. Deploys pending migrations safely without data loss.
 */
async function runAutoMigrations() {
  logger.info('Checking database migration state...');

  try {
    // Check if `users` table already exists
    const usersTableCheck = await pool.query(
      `SELECT to_regclass('public.users') AS exists;`
    );
    const usersExist = Boolean(usersTableCheck.rows[0]?.exists);

    // Check if `_prisma_migrations` table exists
    const migrationsTableCheck = await pool.query(
      `SELECT to_regclass('public._prisma_migrations') AS exists;`
    );
    const migrationsTableExist = Boolean(migrationsTableCheck.rows[0]?.exists);

    let initApplied = false;
    if (migrationsTableExist) {
      const initCheck = await pool.query(
        `SELECT id FROM "public"."_prisma_migrations" WHERE migration_name LIKE '%_init' AND finished_at IS NOT NULL LIMIT 1;`
      );
      initApplied = initCheck.rowCount !== null && initCheck.rowCount > 0;
    }

    if (usersExist && !initApplied) {
      logger.info('Existing database detected without 0_init baseline. Marking 0_init as applied...');
      try {
        await execAsync('npx prisma migrate resolve --applied 0_init', {
          env: process.env,
        });
        logger.info('0_init marked as applied successfully.');
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Notice when resolving 0_init baseline (proceeding to deploy)');
      }
    }

    logger.info('Applying Prisma migrations (migrate deploy)...');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      env: process.env,
    });
    if (stdout) logger.info(stdout.trim());
    if (stderr && !stderr.includes('Prisma schema loaded')) logger.warn(stderr.trim());
    logger.info('Prisma migrations deployed successfully.');
  } catch (err: any) {
    logger.error({ err }, 'Error during automated database migration');
    throw err;
  }
}

export async function initDb() {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query('SELECT NOW()');
      logger.info('Successfully connected to PostgreSQL');
      break;
    } catch (err) {
      logger.warn(`PostgreSQL connection failed. Retrying... (${retries} left)`);
      retries -= 1;
      await sleep(2500);
    }
  }

  if (retries === 0) {
    throw new Error('Could not connect to database after several attempts');
  }

  // 1. Run migrations
  await runAutoMigrations();

  // 2. Initialize secrets from database or environment
  await loadSecrets({
    async get(key: string) {
      const setting = await prisma.appSetting.findUnique({ where: { key } });
      return setting ? setting.value : null;
    },
    async setIfAbsent(key: string, value: string) {
      const existing = await prisma.appSetting.findUnique({ where: { key } });
      if (existing) return existing.value;
      try {
        const created = await prisma.appSetting.create({ data: { key, value } });
        return created.value;
      } catch {
        const found = await prisma.appSetting.findUnique({ where: { key } });
        return found ? found.value : value;
      }
    },
  });

  // 3. Clean up expired refresh tokens
  try {
    const deleted = await prisma.refreshToken.deleteMany({
      where: { expires_at: { lt: new Date() } },
    });
    if (deleted.count > 0) {
      logger.info({ count: deleted.count }, 'Cleaned up expired refresh tokens');
    }
  } catch (err) {
    logger.warn({ err }, 'Could not clean up expired refresh tokens');
  }
}

export { prisma, pool };
export default prisma;
