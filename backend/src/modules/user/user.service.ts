import { prisma } from '../../common/prisma';
import { NotFoundError, BadRequestError } from '../../common/errors';

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const { passwordHash, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    avatar?: string;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.gender && { gender: data.gender }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.avatar && { avatar: data.avatar }),
      },
      include: {
        addresses: true,
        preferences: true,
      },
    });

    const { passwordHash, ...profile } = user;
    return profile;
  }

  // ── Addresses ──
  async getAddresses(userId: string) {
    return prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, data: {
    label?: string;
    phone?: string;
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.userAddress.create({
      data: {
        ...data,
        userId,
        country: data.country || 'TZ',
      },
    });
  }

  async updateAddress(userId: string, addressId: string, data: {
    label?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }) {
    const address = await prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundError('Address');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return prisma.userAddress.update({
      where: { id: addressId },
      data,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundError('Address');
    }

    await prisma.userAddress.delete({ where: { id: addressId } });
  }

  // ── Preferences ──
  async getPreferences(userId: string) {
    let prefs = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await prisma.userPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, data: {
    language?: string;
    currency?: string;
    smsEnabled?: boolean;
    emailEnabled?: boolean;
    pushEnabled?: boolean;
  }) {
    return prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}