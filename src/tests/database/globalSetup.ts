import { execSync } from 'node:child_process';
import { Client } from 'pg';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/systembarber';

function buildTestDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace('/', '');
  url.pathname = `/${database}_test`;
  return url.toString();
}

export const TEST_DATABASE_URL = buildTestDatabaseUrl(
  process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
);

export default async function globalSetup() {
  const adminUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const client = new Client({ connectionString: adminUrl });
  await client.connect();

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
