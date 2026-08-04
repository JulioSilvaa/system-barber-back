import IUserRepository from '@/domain/repository/UserRepository';

export default class ListUserUseCase {
  private readonly _userRepository: IUserRepository;
  constructor(private userRepository: IUserRepository) {
    this._userRepository = userRepository;
  }

  async execute() {
    const users = await this._userRepository.list();
    return users;
  }
}
