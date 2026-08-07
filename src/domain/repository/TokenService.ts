export type TokenActor = 'USER' | 'BARBERSHOP' | 'ADMIN';

export type TokenPayload = {
  sub: string;
  actor?: TokenActor;
  barbershopId?: string;
  localRole?: string;
  iat?: number;
  exp?: number;
};

export interface ITokenService {
  sign(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn: string): string;
  verify(token: string): TokenPayload;
}
