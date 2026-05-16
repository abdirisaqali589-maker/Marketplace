import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as returnController from './return.controller';

const router = Router();

// Customer routes
router.post('/', authenticate, returnController.create);
router.get('/my-returns', authenticate, returnController.getMyReturns);
router.get('/:id', authenticate, returnController.getById);

// Admin routes
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), returnController.getAll);
router.patch('/:id/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), returnController.updateStatus);

export default router;