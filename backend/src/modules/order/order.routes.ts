import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as orderController from './order.controller';

const router = Router();

// Customer routes
router.post('/', authenticate, orderController.create);
router.get('/my-orders', authenticate, orderController.getMyOrders);
router.get('/number/:orderNumber', authenticate, orderController.getByOrderNumber);

// Seller routes
router.get('/seller/orders', authenticate, authorize('SELLER'), orderController.getSellerOrders);

// Admin routes
router.get('/admin/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), orderController.getAll);
router.patch('/:id/status', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), orderController.updateStatus);

router.get('/:id', authenticate, orderController.getById);
router.post('/:id/cancel', authenticate, orderController.cancelOrder);

export default router;
