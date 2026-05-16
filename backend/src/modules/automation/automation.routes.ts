import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as automationController from './automation.controller';

const router = Router();

router.post('/marketplace/run', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), automationController.runMarketplace);
router.get('/worker/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), automationController.getWorkerStatus);
router.post('/worker/trigger', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), automationController.triggerQueue);

export default router;
