import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

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

// Helper to wait
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function initDb() {
  let retries = 5;
  while (retries > 0) {
    try {
      // Test connection
      await pool.query('SELECT NOW()');
      console.log('Successfully connected to PostgreSQL');
      break;
    } catch (err) {
      console.error(`PostgreSQL connection failed. Retrying... (${retries} left)`, err);
      retries -= 1;
      await sleep(3000);
    }
  }

  if (retries === 0) {
    throw new Error('Could not connect to database after several attempts');
  }

  // Run Prisma db push to sync schema automatically on start
  console.log('Running Prisma schema synchronization (db push)...');
  await new Promise<void>((resolve, reject) => {
    exec('npx prisma db push --accept-data-loss', { env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error running Prisma db push:', error);
        console.error(stderr);
        reject(error);
      } else {
        console.log(stdout);
        console.log('Prisma schema synchronized successfully.');
        resolve();
      }
    });
  });
}

export { prisma, pool };
export default prisma;
