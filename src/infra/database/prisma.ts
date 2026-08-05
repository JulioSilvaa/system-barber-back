import 'dotenv/config';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';

export function createPrismaClient(connectionUrl: string): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: connectionUrl });
  return new PrismaClient({ adapter });
}

let client: PrismaClient | undefined;

export function getPrismaClient(url?: string): PrismaClient {
  if (!client) {
    client = createPrismaClient(url ?? process.env.DATABASE_URL ?? 'file:./prisma/dev.db');
  }
  return client;
}
