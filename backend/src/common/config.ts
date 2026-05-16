import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Meilisearch
  meilisearchUrl: process.env.MEILISEARCH_URL || 'http://localhost:7700',
  meilisearchKey: process.env.MEILISEARCH_KEY || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // OTP
  otpProvider: process.env.OTP_PROVIDER || 'mock',
  smtpHost: process.env.SMTP_HOST || '',
  smtpFrom: process.env.SMTP_FROM || 'no-reply@marketplace.local',
  smsProviderUrl: process.env.SMS_PROVIDER_URL || '',
  smsProviderKey: process.env.SMS_PROVIDER_KEY || '',

  // SendGrid (Email)
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',

  // Twilio (SMS)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',

  // Cloudinary (Image CDN)
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',

  // Payments
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',

  // Upload
  uploadDir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '15728640', 10),

  // Default Admin
  adminEmail: process.env.ADMIN_EMAIL || 'admin@marketplace.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',

  // Sentry (Error Tracking)
  sentryDsn: process.env.SENTRY_DSN || '',

  // Google Analytics
  gaTrackingId: process.env.GA_TRACKING_ID || '',
};
