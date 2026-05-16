import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as promotionController from './promotion.controller';

const router = Router();

// Campaigns
router.get('/campaigns/active', promotionController.getActiveCampaigns);
router.get('/campaigns', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), promotionController.getCampaigns);
router.post('/campaigns', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), promotionController.createCampaign);
router.delete('/campaigns/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), promotionController.deleteCampaign);

// Coupons
router.get('/coupons', authenticate, authorize('ADMIN', 'SELLER'), promotionController.getCoupons);
router.post('/coupons', authenticate, authorize('ADMIN', 'SELLER'), promotionController.createCoupon);
router.get('/coupons/validate/:code', authenticate, promotionController.validateCoupon);
router.put('/coupons/:id', authenticate, authorize('ADMIN', 'SELLER'), promotionController.updateCoupon);
router.delete('/coupons/:id', authenticate, authorize('ADMIN', 'SELLER'), promotionController.deleteCoupon);

export default router;