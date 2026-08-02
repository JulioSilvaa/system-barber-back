import { User } from '@/domain/entities';
import IUserRepository from '@/domain/repository/UserRepository';

export default class UserRepositoryMemory implements IUserRepository {
  private readonly users: User[] = [];

  async save(user: User): Promise<void> {
    this.users.push(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.users.find(user => user.email.trim().toLowerCase() === normalizedEmail) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) ?? null;
  }
}
