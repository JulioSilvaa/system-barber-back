import 'dotenv/config';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import createAuthRoutes from '../routes/authRoutes';
import createBarbershopRoutes from '../routes/barbershopRoutes';
import createMembershipRoutes from '../routes/membershipRoutes';
import createServiceRoutes from '../routes/serviceRoutes';
import createAppointmentRoutes from '../routes/appointmentRoutes';
import createUserRoutes from '../routes/userRoutes';
import healthRoutes from '../routes/healthRoutes';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import { createRepositorySet, RepositorySet } from '@/infra/repositories/factory';

export function createApp(deps?: { repositories?: RepositorySet }) {
  const app = express();

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

  const repositories = deps?.repositories ?? createRepositorySet();
  const {
    userRepository,
    barbershopRepository,
    userBarbershopRepository,
    serviceRepository,
    appointmentRepository,
  } = repositories;
  const hashService = new BcryptHashService();
  const tokenService = new JwtTokenService();

  app.use(
    '/api',
    createUserRoutes({ userRepository, userBarbershopRepository }),
    createBarbershopRoutes({ barbershopRepository, userBarbershopRepository }),
    createMembershipRoutes({ userBarbershopRepository, userRepository, barbershopRepository }),
    createServiceRoutes({ serviceRepository, barbershopRepository, userBarbershopRepository }),
    createAppointmentRoutes({
      appointmentRepository,
      serviceRepository,
      barbershopRepository,
      userBarbershopRepository,
    }),
    createAuthRoutes({ userRepository, hashService, tokenService, userBarbershopRepository }),
  );
  app.use('/', healthRoutes);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);

    if (err instanceof Error) {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Internal Server Error' });
  });

  return app;
}
