import HashRepository from '@/domain/repository/HashRepository';
import bcrypt from 'bcryptjs';

export default class BcryptHashService implements HashRepository {
  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, Number(process.env.BCRYPT_SALT));
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
