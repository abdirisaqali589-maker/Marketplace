import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as pluginController from './plugin.controller';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/', pluginController.listPlugins);
router.post('/', pluginController.createPlugin);
router.get('/:id', pluginController.getPlugin);
router.patch('/:id', pluginController.updatePlugin);
router.delete('/:id', pluginController.deletePlugin);
router.patch('/:id/toggle', pluginController.togglePlugin);
router.get('/webhooks/:eventType', pluginController.getPluginWebhooks);

export default router;