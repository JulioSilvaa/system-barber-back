import { User } from '@/domain/entities';
import IUserRepository from '@/domain/repository/UserRepository';

export default class UserRepositoryMemory implements IUserRepository {
  private users: User[] = [];

  async save(user: User): Promise<void> {
    const existingIndex = this.users.findIndex(item => item.id === user.id);

    if (existingIndex !== -1) {
      this.users[existingIndex] = user;
    } else {
      this.users.push(user);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.users.find(user => user.email.trim().toLowerCase() === normalizedEmail) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) ?? null;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return this.users.filter(user => ids.includes(user.id));
  }

  async delete(id: string): Promise<void> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new Error('Usuário não encontrado');
    }
    this.users.splice(userIndex, 1);
  }

  async list(): Promise<User[]> {
    return this.users;
  }
}
