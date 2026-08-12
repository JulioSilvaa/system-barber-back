export const RESERVED_SLUGS = new Set([
  'admin',
  'admins',
  'api',
  'b',
  'barbearias',
  'cadastro',
  'cadastro-barbearia',
  'configuracoes',
  'customers',
  'equipe',
  'financeiro',
  'health',
  'ia',
  'login',
  'memberships',
  'painel',
  'servicos',
  'services',
  'users',
  'uploads',
]);

const MAX_SLUG_LENGTH = 44;

export function slugify(raw: string): string {
  const base = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, MAX_SLUG_LENGTH);

  return base || 'barbearia';
}

type IsTaken = (slug: string) => Promise<boolean> | boolean;

export async function generateUniqueSlug(
  name: string,
  isTaken: IsTaken,
  reserved: Set<string> = RESERVED_SLUGS,
): Promise<string> {
  const base = slugify(name);
  const occupied = async (candidate: string) =>
    reserved.has(candidate) || (await isTaken(candidate));

  let candidate = base;
  let attempts = 0;

  while (await occupied(candidate)) {
    attempts += 1;
    if (attempts < 10) {
      candidate = `${base.slice(0, MAX_SLUG_LENGTH - 2)}-${attempts + 1}`;
    } else {
      candidate = `${base.slice(0, MAX_SLUG_LENGTH - 8)}-${Date.now().toString(36)}`;
    }
  }

  return candidate;
}
