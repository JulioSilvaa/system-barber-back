import 'dotenv/config';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import routes from '../routes/index.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
    }),
  );

  app.use(routes);

  app.use((err: unknown, _req: Request, res: Response) => {
    console.error(err);

    if (err instanceof Error) {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Internal Server Error' });
  });

  return app;
};

export default createApp;
