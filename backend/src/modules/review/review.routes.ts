import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as reviewController from './review.controller';

const router = Router();

// Public routes
router.get('/product/:productId', reviewController.getByProduct);

// Auth routes
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), reviewController.getAll);
router.get('/seller/mine', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), reviewController.getSellerReviews);
router.post('/', authenticate, reviewController.create);
router.put('/:id', authenticate, reviewController.update);
router.delete('/:id', authenticate, reviewController.remove);
router.post('/:id/reply', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), reviewController.reply);
router.patch('/:id/approval', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), reviewController.toggleApproval);

export default router;
