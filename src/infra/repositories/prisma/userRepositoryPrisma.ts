import { User } from '@/domain/entities';
import IUserRepository from '@/domain/repository/UserRepository';
import type { PrismaClient, User as PrismaUser } from '@/generated/prisma/client';

function toEntity(row: PrismaUser): User {
  return new User({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    password: row.password ?? undefined,
    isActive: row.isActive,
  });
}

export default class UserRepositoryPrisma implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(user: User): Promise<void> {
    const data = {
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase(),
      phone: user.phone,
      password: user.password ?? null,
      isActive: user.isActive,
    };

    await this.prisma.user.upsert({
      where: { id: user.id },
      create: data,
      update: data,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return row ? toEntity(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch {
      throw new Error('Usuário não encontrado');
    }
  }

  async list(): Promise<User[]> {
    const rows = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toEntity);
  }
}
