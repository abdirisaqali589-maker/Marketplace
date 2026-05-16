import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as categoryController from './category.controller';

const router = Router();

// Public routes
router.get('/', categoryController.getAll);
router.get('/tree', categoryController.getTree);
router.get('/slug/:slug', categoryController.getBySlug);
router.get('/:id/filters', categoryController.getFilters);
router.get('/:id/attributes', categoryController.getAttributes);

// Admin routes
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.create);
router.put('/reorder', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.reorder);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.update);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.remove);
router.get('/:id', categoryController.getById);

export default router;
