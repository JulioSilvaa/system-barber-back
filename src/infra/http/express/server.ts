import { createApp } from './app.js';

const PORT = process.env.PORT ?? 3333;

export const startServer = () => {
  const app = createApp();

  return app.listen(PORT, () => {
    console.log(`🚀 API running on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
