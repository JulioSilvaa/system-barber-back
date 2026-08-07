import { Admin } from '@/domain/entities';

export default interface IAdminRepository {
  save(admin: Admin): Promise<void>;
  findByEmail(email: string): Promise<Admin | null>;
  findById(id: string): Promise<Admin | null>;
  list(): Promise<Admin[]>;
  delete(id: string): Promise<void>;
}
