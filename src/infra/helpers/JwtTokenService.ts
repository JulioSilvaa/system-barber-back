import jwt from 'jsonwebtoken';
import { ITokenService, TokenPayload } from '@/domain/repository/TokenService';

export default class JwtTokenService implements ITokenService {
  sign(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn: string): string {
    const secret =
      expiresIn === '7d' ? process.env.JWT_REFRESH_SECRET : process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error('JWT secret is not defined');
    }

    return jwt.sign(payload, secret, {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verify(token: string): TokenPayload {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    return jwt.verify(token, process.env.JWT_ACCESS_SECRET) as TokenPayload;
  }
}
