import 'dotenv/config';

import CreateAdminUserUseCase from '@/application/useCases/user/CreateAdmin';
import { createRepositorySet } from '@/infra/repositories/factory';

async function seedAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const phone = process.env.ADMIN_PHONE;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !phone || !password) {
    console.error(
      'Variáveis de ambiente ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE e ADMIN_PASSWORD são obrigatórias.',
    );
    process.exit(1);
  }

  const { userRepository } = createRepositorySet();
  const createAdmin = new CreateAdminUserUseCase(userRepository);

  try {
    const admin = await createAdmin.execute({ name, email, phone, password });
    console.log('SUPER_ADMIN criado com sucesso:');
    console.log({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      globalRole: admin.globalRole,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email já cadastrado') {
      console.log('SUPER_ADMIN já existe. Nenhuma ação necessária.');
      return;
    }
    console.error('Erro ao criar SUPER_ADMIN:', error);
    process.exit(1);
  }
}

seedAdmin();
