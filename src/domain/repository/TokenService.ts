export type TokenPayload = {
  sub: string;
  globalRole: string;
  barbershopId?: string;
  localRole?: string;
  iat?: number;
  exp?: number;
};

export interface ITokenService {
  sign(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn: string): string;
  verify(token: string): TokenPayload;
}
