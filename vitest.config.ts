import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      DB_DRIVER: 'memory',
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      BCRYPT_SALT: '10',
    },
    globalSetup: ['./src/tests/database/globalSetup.ts'],
  },
});
