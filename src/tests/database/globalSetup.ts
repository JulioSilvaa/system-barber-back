import 'dotenv/config';
import { execSync } from 'node:child_process';
import { Client } from 'pg';

function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || null;
}

function buildTestDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace('/', '');
  url.pathname = `/${database}_test`;
  return url.toString();
}

export let TEST_DATABASE_URL: string | null = null;

export default async function globalSetup() {
  const adminUrl = getDatabaseUrl();
  if (!adminUrl) {
    console.warn('[vitest] DATABASE_URL não definida — pulando setup do banco de testes.');
    return;
  }

  TEST_DATABASE_URL = buildTestDatabaseUrl(adminUrl);

  const client = new Client({ connectionString: adminUrl });
  try {
    await client.connect();
  } catch {
    console.warn(
      '[vitest] Não foi possível conectar ao PostgreSQL — pulando setup do banco de testes.',
    );
    return;
  }

  const testDatabase = new URL(TEST_DATABASE_URL).pathname.replace('/', '');
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [testDatabase]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE ${testDatabase}`);
  }

  await client.end();

  execSync('yarn prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
