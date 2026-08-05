import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '@/generated/prisma/client';

export const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/systembarber';

export function createPrismaClient(connectionUrl: string): PrismaClient {
  const pool = new Pool({ connectionString: connectionUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

let client: PrismaClient | undefined;

export function getPrismaClient(url?: string): PrismaClient {
  if (!client) {
    client = createPrismaClient(url ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL);
  }
  return client;
}
