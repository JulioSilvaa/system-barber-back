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

  verify(token: string, type: 'access' | 'refresh' = 'access'): TokenPayload {
    const secret =
      type === 'refresh' ? process.env.JWT_REFRESH_SECRET : process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error(
        type === 'refresh'
          ? 'JWT_REFRESH_SECRET is not defined'
          : 'JWT_ACCESS_SECRET is not defined',
      );
    }

    return jwt.verify(token, secret) as TokenPayload;
  }
}
