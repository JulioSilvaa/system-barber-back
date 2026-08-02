import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'system-barber-api - Funcionando normalmente',
  });
});

export default router;