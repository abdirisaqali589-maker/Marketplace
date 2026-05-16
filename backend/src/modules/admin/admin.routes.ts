import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as adminController from './admin.controller';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);

router.get('/roles', adminController.getRoles);
router.post('/roles', adminController.createRole);
router.put('/roles/:id', adminController.updateRole);
router.delete('/roles/:id', adminController.deleteRole);
router.post('/assign-role', adminController.assignRole);

router.get('/audit-logs', adminController.getAuditLogs);

router.post('/sellers/:id/verify', adminController.verifySeller);
router.post('/sellers/:id/reject', adminController.rejectSeller);

export default router;