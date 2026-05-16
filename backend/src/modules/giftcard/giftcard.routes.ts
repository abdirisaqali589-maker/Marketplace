import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { GiftCardService } from './giftcard.service';

const router = Router();
const giftCardService = new GiftCardService();

// List gift cards (admin only)
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await giftCardService.findAll(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// Check gift card balance (public)
router.get('/balance/:code', async (req, res, next) => {
  try {
    const balance = await giftCardService.getBalance(req.params.code);
    res.json({ success: true, data: balance });
  } catch (error) {
    next(error);
  }
});

// Create gift card
router.post('/', authenticate, async (req, res, next) => {
  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role);
    const data = { ...req.body, buyerId: isAdmin ? req.body.buyerId : req.user!.userId };
    const card = await giftCardService.create(data);
    res.status(201).json({ success: true, data: card });
  } catch (error) {
    next(error);
  }
});

// Redeem gift card
router.post('/redeem', authenticate, async (req, res, next) => {
  try {
    const { code, amount } = req.body;
    const usage = await giftCardService.redeem(code, req.user!.userId, amount);
    res.json({ success: true, data: usage });
  } catch (error) {
    next(error);
  }
});

// Get user's gift cards
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const cards = await giftCardService.getUserGiftCards(req.user!.userId);
    res.json({ success: true, data: cards });
  } catch (error) {
    next(error);
  }
});

// Get usage history
router.get('/:id/usage', authenticate, async (req, res, next) => {
  try {
    const history = await giftCardService.getUsageHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

// Deactivate gift card
router.patch('/:id/deactivate', authenticate, async (req, res, next) => {
  try {
    const card = await giftCardService.deactivate(req.params.id);
    res.json({ success: true, data: card });
  } catch (error) {
    next(error);
  }
});

// Update gift card active state (admin only)
router.patch('/:id/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const card = await giftCardService.setActive(req.params.id, Boolean(req.body.isActive));
    res.json({ success: true, data: card });
  } catch (error) {
    next(error);
  }
});

export default router;
