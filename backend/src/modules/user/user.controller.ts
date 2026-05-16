import { Request, Response } from 'express';
import { UserService } from './user.service';
import { asyncHandler } from '../../common/middleware';
import {
  updateProfileSchema,
  createAddressSchema,
  updateAddressSchema,
  updatePreferencesSchema,
} from './user.validation';
import { ValidationError } from '../../common/errors';

const userService = new UserService();

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.getProfile(req.user!.userId);
  res.json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const profile = await userService.updateProfile(req.user!.userId, result.data);
  res.json({ success: true, message: 'Profile updated', data: profile });
});

export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await userService.getAddresses(req.user!.userId);
  res.json({ success: true, data: addresses });
});

export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const result = createAddressSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const address = await userService.createAddress(req.user!.userId, result.data);
  res.status(201).json({ success: true, message: 'Address created', data: address });
});

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const result = updateAddressSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const address = await userService.updateAddress(req.user!.userId, req.params.id, result.data);
  res.json({ success: true, message: 'Address updated', data: address });
});

export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteAddress(req.user!.userId, req.params.id);
  res.json({ success: true, message: 'Address deleted' });
});

export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  const prefs = await userService.getPreferences(req.user!.userId);
  res.json({ success: true, data: prefs });
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const result = updatePreferencesSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const prefs = await userService.updatePreferences(req.user!.userId, result.data);
  res.json({ success: true, message: 'Preferences updated', data: prefs });
});