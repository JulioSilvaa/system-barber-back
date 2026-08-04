import { GlobalUserRole } from '@/domain/entities/User';

export interface CreateUserInputDTO {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface CreateUserOutputDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  globalRole: GlobalUserRole;
  isActive: boolean;
}
