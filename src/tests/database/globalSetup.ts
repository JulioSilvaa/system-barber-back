import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

export const TEST_DATABASE_URL = 'file:./.tmp/test.db';

export default function globalSetup() {
  const tmpDir = resolve(process.cwd(), '.tmp');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  rmSync(resolve(tmpDir, 'test.db'), { force: true });
  rmSync(resolve(tmpDir, 'test.db-journal'), { force: true });
  rmSync(resolve(tmpDir, 'test.db-wal'), { force: true });
  rmSync(resolve(tmpDir, 'test.db-shm'), { force: true });

  execSync('yarn prisma db push', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
