import 'dotenv/config';

import { createServer } from 'http';

import { createApp } from './app';
import { initSocketServer } from '@/infra/websocket/socketServer';

const PORT = process.env.PORT ?? 3333;

const app = createApp();
const httpServer = createServer(app);
initSocketServer(httpServer);

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 API running on port ${PORT}`);
  });
}

export default app;
