import 'dotenv/config';
import { execSync } from 'node:child_process';
import { Client } from 'pg';

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL não definida. Configure a variável de ambiente para rodar os testes.',
    );
  }
  return databaseUrl;
}

function buildTestDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace('/', '');
  url.pathname = `/${database}_test`;
  return url.toString();
}

export const TEST_DATABASE_URL = buildTestDatabaseUrl(requireDatabaseUrl());

export default async function globalSetup() {
  const adminUrl = requireDatabaseUrl();
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
