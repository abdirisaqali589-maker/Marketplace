import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as workflowController from './workflow.controller';

const router = Router();

// Template routes (admin)
router.get('/templates', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), workflowController.listTemplates);
router.post('/templates', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), workflowController.createTemplate);
router.patch('/templates/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), workflowController.updateTemplate);
router.delete('/templates/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), workflowController.deleteTemplate);
router.patch('/templates/:id/toggle', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), workflowController.toggleTemplate);

// Run routes
router.post('/run/:slug', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), workflowController.triggerRun);
router.get('/runs', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), workflowController.listRuns);
router.get('/runs/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), workflowController.getRun);
router.post('/runs/:runId/retry/:stepIndex', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), workflowController.retryStep);

export default router;