import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as brandController from './brand.controller';

const router = Router();

// Public routes
router.get('/', brandController.getAll);
router.get('/:id', brandController.getById);

// Authenticated sellers can propose brands; admins can approve and manage them.
router.post('/', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), brandController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), brandController.update);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), brandController.remove);

export default router;
