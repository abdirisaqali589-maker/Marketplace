import { Router } from 'express';
import { authenticate } from '../../common/middleware';
import { MessagingService } from './messaging.service';

const router = Router();
const messagingService = new MessagingService();

// Get all conversations
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await messagingService.getConversations(
      req.user!.userId,
      Number(page) || 1,
      Number(limit) || 20,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get or create a conversation
router.post('/conversations', authenticate, async (req, res, next) => {
  try {
    const { recipientId, orderId } = req.body;
    const conversation = await messagingService.getOrCreateConversation(req.user!.userId, recipientId, orderId);
    res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
});

// Get messages in a conversation
router.get('/conversations/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await messagingService.getMessages(
      req.params.id,
      req.user!.userId,
      Number(page) || 1,
      Number(limit) || 50,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Send a message
router.post('/conversations/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { content, attachments } = req.body;
    const message = await messagingService.sendMessage(req.params.id, req.user!.userId, content, attachments);
    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

// Mark messages as read
router.put('/conversations/:id/read', authenticate, async (req, res, next) => {
  try {
    const result = await messagingService.markAsRead(req.params.id, req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get unread message count
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await messagingService.getUnreadCount(req.user!.userId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

export default router;