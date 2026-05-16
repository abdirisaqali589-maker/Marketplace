import bcrypt from 'bcryptjs';
import { prisma } from '../../common/prisma';
import { generateTokens } from '../../common/jwt';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../common/errors';
import { AuthPayload } from '../../common/middleware';
import { deleteOtp, getOtp, setOtp } from '../../common/otp-store';
import { sendContactMessage } from '../../common/notification-provider';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export class AuthService {
  async register(data: {
    email?: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone: data.phone },
        ],
      },
    });

    if (existing) {
      throw new ConflictError('User with this email or phone already exists');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        preferences: {
          create: {},
        },
      },
    });

    // Send OTP
    await this.sendOtp(data.email || data.phone!);

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
    };

    const tokens = generateTokens(payload);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(emailOrPhone: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
    };

    const tokens = generateTokens(payload);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        kycStatus: user.kycStatus,
      },
      ...tokens,
    };
  }

  async sendOtp(contact: string) {
    const otp = generateOtp();
    await setOtp(`otp:${contact}`, otp, 10 * 60);
    await sendContactMessage(contact, 'MarketPlace verification code', `Your MarketPlace OTP is ${otp}. It expires in 10 minutes.`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(contact: string, otp: string) {
    const stored = await getOtp(`otp:${contact}`);
    if (!stored) {
      throw new BadRequestError('No OTP found. Please request a new one.');
    }

    if (stored !== otp) {
      throw new BadRequestError('Invalid OTP');
    }

    await deleteOtp(`otp:${contact}`);

    // Mark user as verified
    await prisma.user.updateMany({
      where: {
        OR: [
          { email: contact },
          { phone: contact },
        ],
      },
      data: { isVerified: true },
    });

    return { message: 'OTP verified successfully' };
  }

  async refreshAccessToken(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const payload: AuthPayload = {
      userId: stored.user.id,
      email: stored.user.email || undefined,
      phone: stored.user.phone || undefined,
      role: stored.user.role,
    };

    const tokens = generateTokens(payload);

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: stored.user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async forgotPassword(emailOrPhone: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
    });

    if (!user) {
      // Return success even if user not found (security)
      return { message: 'If account exists, reset instructions have been sent' };
    }

    const resetToken = generateOtp();
    await setOtp(`reset:${emailOrPhone}`, resetToken, 15 * 60);
    await sendContactMessage(emailOrPhone, 'MarketPlace password reset', `Your MarketPlace password reset token is ${resetToken}. It expires in 15 minutes.`);

    return { message: 'If account exists, reset instructions have been sent' };
  }

  async resetPassword(contact: string, token: string, newPassword: string) {
    const stored = await getOtp(`reset:${contact}`);
    if (!contact) {
      throw new BadRequestError('Invalid or expired reset token');
    }
    if (!stored || stored !== token) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.updateMany({
      where: {
        OR: [{ email: contact }, { phone: contact }],
      },
      data: { passwordHash },
    });

    await deleteOtp(`reset:${contact}`);

    return { message: 'Password reset successfully' };
  }
}
