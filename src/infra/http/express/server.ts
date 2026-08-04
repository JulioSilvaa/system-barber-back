import 'dotenv/config';

import { createApp } from './app';

const PORT = process.env.PORT ?? 3333;

const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 API running on port ${PORT}`);
  });
}

export default app;
