import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { TicketService } from './ticket.service';

const router = Router();
const ticketService = new TicketService();

// Create ticket
router.post('/', authenticate, async (req, res, next) => {
  try {
    const ticket = await ticketService.create(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
});

// Get user's tickets
router.get('/', authenticate, async (req, res, next) => {
  try {
    const query: any = { ...req.query, userId: req.user!.userId };
    // Admin can see all tickets
    if (['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      delete (query as any).userId;
    }
    const result = await ticketService.findAll(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// Get ticket stats (admin only)
router.get('/stats/overview', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const stats = await ticketService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// Get ticket by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const ticket = await ticketService.findById(req.params.id);
    // Verify user owns ticket or is admin
    if (ticket.userId !== req.user!.userId && !['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
});

// Add message to ticket
router.post('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const ticket = await ticketService.findById(req.params.id);
    if (ticket.userId !== req.user!.userId && !['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role);
    const message = await ticketService.addMessage(req.params.id, req.user!.userId, req.body.body, isStaff, req.body.attachments);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

// Update ticket status (admin only)
router.patch('/:id/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const ticket = await ticketService.updateStatus(req.params.id, req.body.status, req.body.assignedTo);
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
});

export default router;
