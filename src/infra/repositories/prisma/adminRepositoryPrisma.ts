import { Admin } from '@/domain/entities';
import IAdminRepository from '@/domain/repository/AdminRepository';
import type { Admin as PrismaAdmin, PrismaClient } from '@/generated/prisma/client';

function toEntity(row: PrismaAdmin): Admin {
  return new Admin({
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    isActive: row.isActive,
  });
}

export default class AdminRepositoryPrisma implements IAdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(admin: Admin): Promise<void> {
    const data = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      password: admin.password,
      isActive: admin.isActive,
    };

    await this.prisma.admin.upsert({
      where: { id: admin.id },
      create: data,
      update: data,
    });
  }

  async findByEmail(email: string): Promise<Admin | null> {
    const row = await this.prisma.admin.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return row ? toEntity(row) : null;
  }

  async findById(id: string): Promise<Admin | null> {
    const row = await this.prisma.admin.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async list(): Promise<Admin[]> {
    const rows = await this.prisma.admin.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toEntity);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.admin.delete({ where: { id } });
    } catch {
      throw new Error('Admin não encontrado');
    }
  }
}
