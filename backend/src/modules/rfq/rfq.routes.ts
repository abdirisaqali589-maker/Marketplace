import { Router } from 'express';
import { authenticate } from '../../common/middleware';
import * as rfqController from './rfq.controller';

const router = Router();

router.use(authenticate);
router.get('/', rfqController.list);
router.post('/', rfqController.create);
router.get('/:id', rfqController.get);
router.post('/:id/messages', rfqController.message);

export default router;
