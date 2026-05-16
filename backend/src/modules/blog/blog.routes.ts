import { Router } from 'express';
import { authenticate, authorize, optionalAuth } from '../../common/middleware';
import { BlogService } from './blog.service';

const router = Router();
const blogService = new BlogService();

// Public: Get published posts
router.get('/published', async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await blogService.getPublishedPosts(Number(page) || 1, Number(limit) || 12);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// Public: Get blog categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await blogService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// Public: Get post by slug
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const post = await blogService.findBySlug(req.params.slug);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all posts (including drafts)
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await blogService.findAll(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// Admin: Create post
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const data = { ...req.body, authorId: req.user!.userId, authorName: req.user!.email || 'Admin' };
    const post = await blogService.create(data);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: Get post by ID
router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const post = await blogService.findById(req.params.id);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: Update post
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const post = await blogService.update(req.params.id, req.body);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: Publish post
router.patch('/:id/publish', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const post = await blogService.publish(req.params.id);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete post
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await blogService.delete(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

export default router;