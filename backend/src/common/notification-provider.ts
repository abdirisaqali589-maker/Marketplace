import { config } from './config';
import { logger } from './logger';

// ── Email Integration (SendGrid) ──
let sgMail: any = null;
try {
  if (config.sendgridApiKey) {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.sendgridApiKey);
    logger.info('SendGrid email provider initialized');
  }
} catch {
  logger.info('@sendgrid/mail not installed - falling back to dev mode');
}

// ── SMS Integration (Twilio) ──
let twilioClient: any = null;
try {
  if (config.twilioAccountSid && config.twilioAuthToken) {
    twilioClient = require('twilio')(config.twilioAccountSid, config.twilioAuthToken);
    logger.info('Twilio SMS provider initialized');
  }
} catch {
  logger.info('twilio not installed - falling back to dev mode');
}

export async function sendEmail(to: string, subject: string, body: string) {
  if (!sgMail) {
    logger.info('Email provider not configured; message logged for development', { to, subject, body });
    return;
  }
  try {
    await sgMail.send({
      to,
      from: config.smtpFrom || 'no-reply@marketplace.local',
      subject,
      html: body,
    });
    logger.info('Email sent successfully', { to, subject });
  } catch (error) {
    logger.error('Failed to send email', { to, subject, error: (error as Error).message });
    // Fallback: log the email
    logger.info('Email fallback (SendGrid failed):', { to, subject, body });
  }
}

export async function sendEmailWithTemplate(to: string, templateId: string, dynamicData: Record<string, any>) {
  if (!sgMail) {
    logger.info('Email template not configured', { to, templateId, dynamicData });
    return;
  }
  try {
    await sgMail.send({
      to,
      from: config.smtpFrom || 'no-reply@marketplace.local',
      templateId,
      dynamicTemplateData: dynamicData,
    });
    logger.info('Email template sent', { to, templateId });
  } catch (error) {
    logger.error('Failed to send template email', { to, templateId, error: (error as Error).message });
  }
}

export async function sendSms(to: string, body: string) {
  if (!twilioClient) {
    logger.info('SMS provider not configured; message logged for development', { to, body });
    return;
  }
  try {
    const message = await twilioClient.messages.create({
      body,
      from: config.twilioPhoneNumber,
      to,
    });
    logger.info('SMS sent successfully', { to, sid: message.sid });
  } catch (error) {
    logger.error('Failed to send SMS', { to, error: (error as Error).message });
    // Fallback: log the SMS
    logger.info('SMS fallback (Twilio failed):', { to, body });
  }
}

export async function sendOTPEmail(to: string, otp: string) {
  const subject = 'Your OTP Code';
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ea580c; font-size: 28px;">MarketPlace</h1>
      </div>
      <p style="font-size: 16px; color: #374151; margin-bottom: 8px;">Your One-Time Password (OTP) is:</p>
      <div style="background: #fff7ed; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #c2410c;">${otp}</span>
      </div>
      <p style="font-size: 14px; color: #6b7280;">This code expires in 10 minutes. Do not share this code with anyone.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;
  await sendEmail(to, subject, body);
}

export async function sendOrderConfirmationEmail(to: string, order: any) {
  const subject = `Order Confirmation - #${order.orderNumber || order.id.slice(0, 8)}`;
  const itemsHtml = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.product?.title || item.name || 'Product'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">TZS ${(item.price || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ea580c;">Order Confirmed!</h2>
      <p>Thank you for your order. Your order #${order.orderNumber || order.id.slice(0, 8)} has been confirmed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px; text-align: left;">Item</th>
            <th style="padding: 8px; text-align: center;">Qty</th>
            <th style="padding: 8px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="font-size: 18px; font-weight: 700; text-align: right;">Total: TZS ${(order.total || 0).toLocaleString()}</p>
      <p>Estimated delivery: ${order.estimatedDeliveryDate || 'Soon'}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">Track your order at: ${config.frontendUrl}/account/orders/${order.id}</p>
    </div>
  `;
  await sendEmail(to, subject, body);
}

export async function sendContactMessage(contact: string, subject: string, body: string) {
  if (contact.includes('@')) {
    await sendEmail(contact, subject, body);
  } else {
    await sendSms(contact, body);
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const subject = 'Password Reset Request';
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ea580c;">Password Reset</h2>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" style="background: #ea580c; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 12px; color: #9ca3af;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
  await sendEmail(to, subject, body);
}

export async function sendWelcomeEmail(to: string, name: string) {
  const subject = 'Welcome to MarketPlace!';
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ea580c;">Welcome, ${name}!</h2>
      <p>We're excited to have you on MarketPlace. Start exploring products and find what you need.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${config.frontendUrl}" style="background: #ea580c; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Start Shopping</a>
      </div>
    </div>
  `;
  await sendEmail(to, subject, body);
}
