import IUserRepository from '@/domain/repository/UserRepository';

export default class ListUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute() {
    return this.userRepository.list();
  }
}
