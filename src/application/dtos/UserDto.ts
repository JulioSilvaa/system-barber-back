import { UserRole } from '@/domain/entities/User';

export interface CreateUserInputDTO {
  name: string;
  email: string;
  phone: string;
  barbershopId: string;
  password: string;
  role?: UserRole;
}

export interface CreateUserOutputDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  barbershopId: string;
  role: UserRole;
  isActive: boolean;
}
