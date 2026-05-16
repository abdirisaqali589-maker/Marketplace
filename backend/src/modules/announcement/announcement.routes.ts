import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { AnnouncementService } from './announcement.service';

const router = Router();
const announcementService = new AnnouncementService();

// Public: Get active announcements
router.get('/active', async (req, res, next) => {
  try {
    const announcements = await announcementService.getActive();
    res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all announcements
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await announcementService.findAll(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// Admin: Create announcement
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const announcement = await announcementService.create(req.body);
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
});

// Admin: Update announcement
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const announcement = await announcementService.update(req.params.id, req.body);
    res.json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
});

// Admin: Toggle active status
router.patch('/:id/toggle', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const announcement = await announcementService.toggleActive(req.params.id);
    res.json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete announcement
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await announcementService.delete(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

export default router;