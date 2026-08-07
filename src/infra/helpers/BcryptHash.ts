import HashRepository from '@/domain/repository/HashRepository';
import bcrypt from 'bcryptjs';

const DEFAULT_SALT_ROUNDS = 10;

export default class BcryptHashService implements HashRepository {
  async hash(value: string): Promise<string> {
    const saltRounds = Number(process.env.BCRYPT_SALT);

    return bcrypt.hash(
      value,
      Number.isInteger(saltRounds) && saltRounds > 0 ? saltRounds : DEFAULT_SALT_ROUNDS,
    );
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
