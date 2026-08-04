import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import UserController from '../controllers/UserController';

export default function createUserRoutes() {
  const router = Router();

  router.post('/users', ExpressAdapter.create(UserController.add));
  router.delete('/users/:id', ExpressAdapter.create(UserController.delete));

  return router;
}
