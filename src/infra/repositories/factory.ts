import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import AppointmentRepositoryPrisma from '@/infra/repositories/prisma/appointmentRepositoryPrisma';
import BarbershopRepositoryPrisma from '@/infra/repositories/prisma/barbershopRepositoryPrisma';
import ServiceRepositoryPrisma from '@/infra/repositories/prisma/serviceRepositoryPrisma';
import UserBarbershopRepositoryPrisma from '@/infra/repositories/prisma/userBarbershopRepositoryPrisma';
import UserRepositoryPrisma from '@/infra/repositories/prisma/userRepositoryPrisma';
import { getPrismaClient } from '@/infra/database/prisma';
import type { PrismaClient } from '@/generated/prisma/client';

export type RepositoryDriver = 'memory' | 'prisma';

export interface RepositorySet {
  userRepository: IUserRepository;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  serviceRepository: IServiceRepository;
  appointmentRepository: IAppointmentRepository;
}

export function createMemoryRepositorySet(): RepositorySet {
  return {
    userRepository: new UserRepositoryMemory(),
    barbershopRepository: new BarbershopRepositoryMemory(),
    userBarbershopRepository: new UserBarbershopRepositoryMemory(),
    serviceRepository: new ServiceRepositoryMemory(),
    appointmentRepository: new AppointmentRepositoryMemory(),
  };
}

export function createPrismaRepositorySet(prisma: PrismaClient = getPrismaClient()): RepositorySet {
  return {
    userRepository: new UserRepositoryPrisma(prisma),
    barbershopRepository: new BarbershopRepositoryPrisma(prisma),
    userBarbershopRepository: new UserBarbershopRepositoryPrisma(prisma),
    serviceRepository: new ServiceRepositoryPrisma(prisma),
    appointmentRepository: new AppointmentRepositoryPrisma(prisma),
  };
}

export function createRepositorySet(options?: {
  driver?: RepositoryDriver;
  prisma?: PrismaClient;
}): RepositorySet {
  const driver: RepositoryDriver = options?.driver ?? process.env.DB_DRIVER ?? 'prisma';

  if (driver === 'memory') {
    return createMemoryRepositorySet();
  }

  return createPrismaRepositorySet(options?.prisma);
}
