import { User } from '@/domain/entities';

export default interface IUserRepository {
  save(user: User): Promise<void>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  delete(id: string): Promise<void>;
  list(): Promise<User[]>;
}
