import { Router } from 'express';
import { authenticate } from '../../common/middleware';
import {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getPreferences,
  updatePreferences,
} from './user.controller';

const router = Router();

router.use(authenticate);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Addresses
router.get('/addresses', getAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);

// Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

export default router;