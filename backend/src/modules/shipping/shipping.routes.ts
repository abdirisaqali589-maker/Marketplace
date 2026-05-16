import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as shippingController from './shipping.controller';

const router = Router();

// Public tracking
router.get('/track/:trackingNumber', shippingController.track);

// Auth routes
router.post('/', authenticate, authorize('SELLER', 'ADMIN'), shippingController.create);
router.post('/orders/:orderId/label', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), shippingController.generateLabel);
router.get('/order/:orderId', authenticate, shippingController.getByOrder);
router.get('/:id', authenticate, shippingController.getById);
router.post('/:id/events', authenticate, authorize('SELLER', 'ADMIN'), shippingController.appendEvent);
router.patch('/:id', authenticate, authorize('SELLER', 'ADMIN'), shippingController.update);

export default router;
