import { NotFoundError } from '@/domain/errors';
import { Admin } from '@/domain/entities';
import IAdminRepository from '@/domain/repository/AdminRepository';

export default class AdminRepositoryMemory implements IAdminRepository {
  private admins: Admin[] = [];

  async save(admin: Admin): Promise<void> {
    const existingIndex = this.admins.findIndex(item => item.id === admin.id);

    if (existingIndex !== -1) {
      this.admins[existingIndex] = admin;
    } else {
      this.admins.push(admin);
    }
  }

  async findByEmail(email: string): Promise<Admin | null> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.admins.find(admin => admin.email === normalizedEmail) ?? null;
  }

  async findById(id: string): Promise<Admin | null> {
    return this.admins.find(admin => admin.id === id) ?? null;
  }

  async list(): Promise<Admin[]> {
    return this.admins;
  }

  async delete(id: string): Promise<void> {
    const adminIndex = this.admins.findIndex(admin => admin.id === id);
    if (adminIndex === -1) {
      throw new NotFoundError('Admin não encontrado');
    }
    this.admins.splice(adminIndex, 1);
  }
}
