import 'dotenv/config';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import createAdminRoutes from '../routes/adminRoutes';
import createBarbershopRoutes from '../routes/barbershopRoutes';
import createMembershipRoutes from '../routes/membershipRoutes';
import createServiceRoutes from '../routes/serviceRoutes';
import createAppointmentRoutes from '../routes/appointmentRoutes';
import createCustomerRoutes from '../routes/customerRoutes';
import createWorkingHoursRoutes from '../routes/workingHoursRoutes';
import createUserRoutes from '../routes/userRoutes';
import createFinanceRoutes from '../routes/financeRoutes';
import createEvaluationRoutes from '../routes/evaluationRoutes';
import healthRoutes from '../routes/healthRoutes';
import { createSwaggerRouter } from './swagger';
import { UPLOADS_DIR } from '@/infra/http/helpers/logoUpload';
import { isOriginAllowed } from '@/infra/http/helpers/cors';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import AuditService from '@/application/services/AuditService';
import { AppError } from '@/domain/errors';
import { createRepositorySet, RepositorySet } from '@/infra/repositories/factory';

export function createApp(deps?: { repositories?: RepositorySet }) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin(origin, callback) {
        if (isOriginAllowed(origin ?? undefined)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 300;
  const isExemptFromRateLimit = (req: Request) => {
    const path = (req.baseUrl + req.path).toLowerCase();
    return path === '/health' || path.startsWith('/api-docs') || path.startsWith('/socket.io');
  };
  app.use(
    rateLimit({ windowMs: 15 * 60 * 1000, limit: rateLimitMax, skip: isExemptFromRateLimit }),
  );

  const loginRateLimitMax = Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10;
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: loginRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator(req) {
      const email = String((req.body as Record<string, unknown> | undefined)?.email ?? '')
        .trim()
        .toLowerCase();
      return `${ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? '')}|${email}`;
    },
    handler(_req, res) {
      return res.status(429).json({
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      });
    },
  });
  app.use('/api', (req, res, next) => {
    if (deps) return next();
    const path = (req.baseUrl + req.path).toLowerCase();
    if (path.endsWith('/login')) {
      return loginLimiter(req, res, next);
    }
    return next();
  });

  const repositories = deps?.repositories ?? createRepositorySet();
  const {
    userRepository,
    adminRepository,
    barbershopRepository,
    userBarbershopRepository,
    serviceRepository,
    appointmentRepository,
    customerRepository,
    auditRepository,
    workingHoursRepository,
    commissionRepository,
    evaluationRepository,
    financeEntryRepository,
  } = repositories;
  const hashService = new BcryptHashService();
  const tokenService = new JwtTokenService();
  const auditService = new AuditService(auditRepository);

  app.use(
    '/api',
    createUserRoutes({ userRepository, userBarbershopRepository, auditService }),
    createBarbershopRoutes({
      barbershopRepository,
      userBarbershopRepository,
      userRepository,
      auditService,
    }),
    createMembershipRoutes({
      userBarbershopRepository,
      userRepository,
      barbershopRepository,
      auditService,
    }),
    createServiceRoutes({
      serviceRepository,
      barbershopRepository,
      userBarbershopRepository,
      auditService,
    }),
    createAppointmentRoutes({
      appointmentRepository,
      serviceRepository,
      barbershopRepository,
      userBarbershopRepository,
      customerRepository,
      commissionRepository,
      workingHoursRepository,
      auditService,
    }),
    createFinanceRoutes({
      appointmentRepository,
      commissionRepository,
      userBarbershopRepository,
      workingHoursRepository,
      barbershopRepository,
      financeEntryRepository,
    }),
    createEvaluationRoutes({
      evaluationRepository,
      appointmentRepository,
      userBarbershopRepository,
      barbershopRepository,
    }),
    createCustomerRoutes({
      customerRepository,
      barbershopRepository,
      userBarbershopRepository,
      auditService,
    }),
    createWorkingHoursRoutes({
      workingHoursRepository,
      barbershopRepository,
      auditService,
    }),
    createAdminRoutes({
      adminRepository,
      hashService,
      tokenService,
      auditService,
    }),
  );
  app.use('/', healthRoutes);
  app.use(createSwaggerRouter());
  app.use('/uploads', express.static(UPLOADS_DIR));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);

    if (err instanceof AppError) {
      return res.status(err.status).json({ message: err.message, code: err.code });
    }

    if (err instanceof Error) {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Internal Server Error' });
  });

  return app;
}
