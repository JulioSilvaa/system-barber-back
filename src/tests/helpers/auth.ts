export function getAccessToken(loginResponse: { headers: Record<string, unknown> }): string {
  const cookies = loginResponse.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = (cookies ?? []).find(value => value.startsWith('sb_access_token='));
  const token = cookie?.split(';')[0].split('=')[1];
  if (!token) {
    throw new Error('sb_access_token não encontrado nos cookies da resposta de login');
  }
  return token;
}
