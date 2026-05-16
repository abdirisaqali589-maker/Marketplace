import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as paymentController from './payment.controller';

const router = Router();

router.post('/webhook', paymentController.webhook);
router.post('/webhook/:provider', paymentController.webhook);
router.post('/provider-session', authenticate, paymentController.createProviderSession);
router.post('/', authenticate, paymentController.process);
router.get('/order/:orderId', authenticate, paymentController.getByOrder);
router.post('/providers/:providerId/test', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), paymentController.testProvider);
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), paymentController.getAll);

export default router;
