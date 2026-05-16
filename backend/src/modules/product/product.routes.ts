import { Router } from 'express';
import { authenticate, authorize, optionalAuth } from '../../common/middleware';
import * as productController from './product.controller';

const router = Router();

// Public routes
router.get('/', productController.getAll);
router.get('/featured', productController.getFeatured);
router.get('/attribute-template', productController.getAttributeTemplate);
router.get('/search', productController.search);
router.get('/slug/:slug', productController.getBySlug);
router.get('/:id/questions', productController.getQuestions);
router.post('/:id/questions', authenticate, productController.askQuestion);
router.patch('/questions/:questionId/answer', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), productController.answerQuestion);
router.post('/import/preview', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), productController.previewImport);
router.post('/search-index', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), productController.runSearchIndex);
router.post('/inventory/automation', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), productController.runInventoryAutomation);

// Seller routes
router.get('/seller/mine', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), productController.getSellerProducts);
router.post('/', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), productController.create);
router.put('/:id', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), productController.update);
router.delete('/:id', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), productController.remove);
router.patch('/:id/stock', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), productController.updateStock);
router.patch('/:id/approval', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), productController.approve);

// Admin routes
router.patch('/:id/featured', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), productController.toggleFeatured);
router.patch('/:id/active', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), productController.toggleActive);

router.get('/:id', productController.getById);

export default router;
