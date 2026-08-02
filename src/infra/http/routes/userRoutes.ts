import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import userController from '@/infra/http/controllers/UserController';
import { Router } from 'express';

const router = Router();

router.post('/users', ExpressAdapter.create(userController.add.bind(userController.add)));

export default router;
