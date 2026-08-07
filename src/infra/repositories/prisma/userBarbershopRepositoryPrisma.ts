import { UserBarbershop } from '@/domain/entities';
import { LocalBarbershopRole, MembershipStatus } from '@/domain/entities/UserBarbershop';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import type {
  PrismaClient,
  UserBarbershop as PrismaUserBarbershop,
} from '@/generated/prisma/client';

function toEntity(row: PrismaUserBarbershop): UserBarbershop {
  return new UserBarbershop({
    id: row.id,
    userId: row.userId,
    barbershopId: row.barbershopId,
    status: row.status as MembershipStatus,
    localRole: row.localRole as LocalBarbershopRole,
  });
}

export default class UserBarbershopRepositoryPrisma implements IUserBarbershopRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(membership: UserBarbershop): Promise<UserBarbershop> {
    const data = {
      id: membership.id,
      userId: membership.userId,
      barbershopId: membership.barbershopId,
      status: membership.status,
      localRole: membership.localRole,
    };

    await this.prisma.userBarbershop.upsert({
      where: { id: membership.id },
      create: data,
      update: data,
    });

    return membership;
  }

  async findByUserId(userId: string): Promise<UserBarbershop[]> {
    const rows = await this.prisma.userBarbershop.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findByUserAndBarbershop(
    userId: string,
    barbershopId: string,
  ): Promise<UserBarbershop | null> {
    const row = await this.prisma.userBarbershop.findUnique({
      where: { userId_barbershopId: { userId, barbershopId } },
    });
    return row ? toEntity(row) : null;
  }

  async findActiveByBarbershop(barbershopId: string): Promise<UserBarbershop[]> {
    const rows = await this.prisma.userBarbershop.findMany({
      where: { barbershopId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findByBarbershop(barbershopId: string): Promise<UserBarbershop[]> {
    const rows = await this.prisma.userBarbershop.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<UserBarbershop | null> {
    const row = await this.prisma.userBarbershop.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.userBarbershop.delete({ where: { id } });
    } catch {
      throw new Error('Vínculo não encontrado');
    }
  }
}
