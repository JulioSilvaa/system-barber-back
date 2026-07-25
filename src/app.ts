import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
    }),
  );

  app.get('/health', (_, response) => {
    return response.status(200).json({
      status: 'ok',
      service: 'system-barber-api',
    });
  });

  return app;
}
