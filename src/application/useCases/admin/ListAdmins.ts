import IAdminRepository from '@/domain/repository/AdminRepository';
import { Admin } from '@/domain/entities';

export default class ListAdminsUseCase {
  constructor(private readonly adminRepository: IAdminRepository) {}

  async execute(): Promise<Admin[]> {
    return this.adminRepository.list();
  }
}
