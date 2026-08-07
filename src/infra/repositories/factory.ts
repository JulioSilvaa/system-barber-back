import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import IAdminRepository from '@/domain/repository/AdminRepository';
import IAuditRepository from '@/domain/repository/AuditRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import AdminRepositoryMemory from '@/infra/repositories/inMemory/admin/adminRepositoryMemory';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import AdminRepositoryPrisma from '@/infra/repositories/prisma/adminRepositoryPrisma';
import AppointmentRepositoryPrisma from '@/infra/repositories/prisma/appointmentRepositoryPrisma';
import AuditRepositoryPrisma from '@/infra/repositories/prisma/auditRepositoryPrisma';
import BarbershopRepositoryPrisma from '@/infra/repositories/prisma/barbershopRepositoryPrisma';
import CustomerRepositoryPrisma from '@/infra/repositories/prisma/customerRepositoryPrisma';
import ServiceRepositoryPrisma from '@/infra/repositories/prisma/serviceRepositoryPrisma';
import UserBarbershopRepositoryPrisma from '@/infra/repositories/prisma/userBarbershopRepositoryPrisma';
import UserRepositoryPrisma from '@/infra/repositories/prisma/userRepositoryPrisma';
import { getPrismaClient } from '@/infra/database/prisma';
import type { PrismaClient } from '@/generated/prisma/client';

export type RepositoryDriver = 'memory' | 'prisma';

export interface RepositorySet {
  userRepository: IUserRepository;
  adminRepository: IAdminRepository;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  serviceRepository: IServiceRepository;
  appointmentRepository: IAppointmentRepository;
  customerRepository: ICustomerRepository;
  auditRepository: IAuditRepository;
}

export function createMemoryRepositorySet(): RepositorySet {
  return {
    userRepository: new UserRepositoryMemory(),
    adminRepository: new AdminRepositoryMemory(),
    barbershopRepository: new BarbershopRepositoryMemory(),
    userBarbershopRepository: new UserBarbershopRepositoryMemory(),
    serviceRepository: new ServiceRepositoryMemory(),
    appointmentRepository: new AppointmentRepositoryMemory(),
    customerRepository: new CustomerRepositoryMemory(),
    auditRepository: new AuditRepositoryMemory(),
  };
}

export function createPrismaRepositorySet(prisma: PrismaClient = getPrismaClient()): RepositorySet {
  return {
    userRepository: new UserRepositoryPrisma(prisma),
    adminRepository: new AdminRepositoryPrisma(prisma),
    barbershopRepository: new BarbershopRepositoryPrisma(prisma),
    userBarbershopRepository: new UserBarbershopRepositoryPrisma(prisma),
    serviceRepository: new ServiceRepositoryPrisma(prisma),
    appointmentRepository: new AppointmentRepositoryPrisma(prisma),
    customerRepository: new CustomerRepositoryPrisma(prisma),
    auditRepository: new AuditRepositoryPrisma(prisma),
  };
}

export function createRepositorySet(options?: {
  driver?: RepositoryDriver;
  prisma?: PrismaClient;
}): RepositorySet {
  const driver: RepositoryDriver =
    options?.driver ?? (process.env.DB_DRIVER as RepositoryDriver | undefined) ?? 'prisma';

  if (driver === 'memory') {
    return createMemoryRepositorySet();
  }

  return createPrismaRepositorySet(options?.prisma);
}
