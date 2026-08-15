import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '@/generated/prisma/client';

export function createPrismaClient(connectionUrl: string): PrismaClient {
  const pool = new Pool({ connectionString: connectionUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

let client: PrismaClient | undefined;

export function getPrismaClient(url?: string): PrismaClient {
  if (!client) {
    const connectionUrl = url ?? process.env.DATABASE_URL;
    if (!connectionUrl) {
      throw new Error('DATABASE_URL não definida. Configure a variável de ambiente.');
    }
    client = createPrismaClient(connectionUrl);
  }
  return client;
}
