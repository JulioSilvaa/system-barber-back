import { User } from '@/domain/entities/User';

export interface IUserRepository {
  findById(id: string, barbershopId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}
