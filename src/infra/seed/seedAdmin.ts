import 'dotenv/config';

import CreateAdminUseCase from '@/application/useCases/admin/CreateAdmin';
import { createRepositorySet } from '@/infra/repositories/factory';

async function seedAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      'Variáveis de ambiente ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórias.',
    );
    process.exit(1);
  }

  const { adminRepository } = createRepositorySet();
  const createAdmin = new CreateAdminUseCase(adminRepository);

  try {
    const admin = await createAdmin.execute({ name, email, password });
    console.log('ADMIN criado com sucesso:');
    console.log({
      id: admin.id,
      name: admin.name,
      email: admin.email,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email já cadastrado') {
      console.log('ADMIN já existe. Nenhuma ação necessária.');
      return;
    }
    console.error('Erro ao criar ADMIN:', error);
    process.exit(1);
  }
}

seedAdmin();
