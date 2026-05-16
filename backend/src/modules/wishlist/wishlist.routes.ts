import { Router } from 'express';
import { authenticate } from '../../common/middleware';
import * as wishlistController from './wishlist.controller';

const router = Router();

router.use(authenticate);
router.get('/', wishlistController.list);
router.post('/', wishlistController.add);
router.delete('/', wishlistController.clear);
router.delete('/:productId', wishlistController.remove);

export default router;
