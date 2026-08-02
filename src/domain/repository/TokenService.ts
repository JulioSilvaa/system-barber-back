export type TokenPayload = {
  sub: string;
  role: string;
  barbershopId: string;
  iat?: number;
  exp?: number;
};

export interface ITokenService {
  sign(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn: string): string;
  verify(token: string): TokenPayload;
}
