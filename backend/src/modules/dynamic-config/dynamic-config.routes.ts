import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as configController from './dynamic-config.controller';

const router = Router();

// Public route
router.get('/public', configController.getPublic);

// Admin routes
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), configController.getAll);
router.get('/:key', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), configController.getByKey);
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), configController.create);
router.put('/:key', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), configController.update);
router.delete('/:key', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), configController.remove);

export default router;