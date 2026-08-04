import { User } from '@/domain/entities';
import IUserRepository from '@/domain/repository/UserRepository';

export default class UserRepositoryMemory implements IUserRepository {
  private users: User[] = [];

  async save(user: User): Promise<void> {
    this.users.push(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.users.find(user => user.email.trim().toLowerCase() === normalizedEmail) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find(user => user.id === id);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      barbershopId: user.barbershopId,
      role: user.role,
      isActive: user.isActive,
    };
  }

  async delete(id: string): Promise<User> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new Error('Ususário não encontrado');
    }
    this.users.splice(userIndex, 1);
  }

  async list(): Promise<User[]> {
    return this.users;
  }
}
