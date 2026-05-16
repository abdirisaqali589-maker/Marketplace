import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as sellerController from './seller.controller';

const router = Router();

// Public routes
router.get('/', sellerController.getPublicSellers);
router.get('/store/:slug', sellerController.getByStoreSlug);

// Seller routes
router.get('/profile', authenticate, authorize('SELLER', 'ADMIN'), sellerController.getProfile);
router.post('/', authenticate, sellerController.create);
router.put('/profile', authenticate, authorize('SELLER'), sellerController.update);
router.put('/storefront', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), sellerController.updateStorefront);
router.get('/dashboard', authenticate, authorize('SELLER'), sellerController.getDashboard);
router.get('/analytics', authenticate, authorize('SELLER'), sellerController.getAnalytics);
router.post('/kyc', authenticate, authorize('SELLER'), sellerController.submitKyc);
router.post('/payouts', authenticate, authorize('SELLER'), sellerController.requestPayout);
router.get('/payouts', authenticate, authorize('SELLER'), sellerController.getPayouts);

export default router;
