import { Customer } from '@/domain/entities/Customer';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import type { Customer as PrismaCustomer, PrismaClient } from '@/generated/prisma/client';

function toEntity(row: PrismaCustomer): Customer {
  return new Customer({
    id: row.id,
    barbershopId: row.barbershopId,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    isActive: row.isActive,
    vip: row.vip,
  });
}

export default class CustomerRepositoryPrisma implements ICustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, barbershopId: string): Promise<Customer | null> {
    const row = await this.prisma.customer.findFirst({
      where: { id, barbershopId },
    });
    return row ? toEntity(row) : null;
  }

  async findByBarbershopAndPhone(barbershopId: string, phone: string): Promise<Customer | null> {
    const row = await this.prisma.customer.findUnique({
      where: { barbershopId_phone: { barbershopId, phone: phone.trim() } },
    });
    return row ? toEntity(row) : null;
  }

  async findByBarbershop(barbershopId: string): Promise<Customer[]> {
    const rows = await this.prisma.customer.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findByIds(ids: string[], barbershopId: string): Promise<Customer[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.prisma.customer.findMany({
      where: { id: { in: ids }, barbershopId },
    });
    return rows.map(toEntity);
  }

  async save(customer: Customer): Promise<Customer> {
    const data = {
      id: customer.id,
      barbershopId: customer.barbershopId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? null,
      isActive: customer.isActive,
      vip: customer.vip,
    };

    await this.prisma.customer.upsert({
      where: { id: customer.id },
      create: data,
      update: data,
    });

    return customer;
  }

  async setVip(id: string, barbershopId: string, vip: boolean): Promise<Customer | null> {
    const result = await this.prisma.customer.updateMany({
      where: { id, barbershopId },
      data: { vip },
    });

    if (result.count === 0) {
      return null;
    }

    const row = await this.prisma.customer.findFirst({ where: { id, barbershopId } });
    return row ? toEntity(row) : null;
  }
}
