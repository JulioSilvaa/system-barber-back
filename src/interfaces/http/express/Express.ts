import 'dotenv/config';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

// --- Segurança e middlewares globais ---
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
  }),
);

// --- Health check ---
app.get('/health', (_req: Request, res: Response) => {
  return res.status(200).json({ status: 'ok', service: 'system-barber-api' });
});

// --- Rotas de domínio ---
// app.use('/api', barbershopRoutes);

// --- Error handler global (4 parâmetros obrigatórios para o Express reconhecer) ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  if (err instanceof Error) {
    return res.status(400).json({ message: err.message });
  }

  return res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT ?? 3333;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

export { app };
startServer();
