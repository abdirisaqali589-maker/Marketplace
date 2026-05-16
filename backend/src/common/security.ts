import crypto from 'crypto';
import { config } from './config';
import { logger } from './logger';

// ── CSRF Protection ──
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrfToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
  } catch {
    return false;
  }
}

// ── Input Sanitization / XSS Protection ──
export function sanitizeHtml(input: string): string {
  if (!input) return input;
  return input
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;');
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: any) =>
        typeof item === 'string' ? sanitizeHtml(item) :
        item !== null && typeof item === 'object' ? sanitizeObject(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

// ── Password Strength Validation ──
export interface PasswordStrengthResult {
  valid: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (password.length >= 12) {
    score += 25;
  } else {
    score += 15;
  }

  if (password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }

  if (/[A-Z]/.test(password)) score += 15;
  else suggestions.push('Add an uppercase letter');

  if (/[a-z]/.test(password)) score += 15;
  else suggestions.push('Add a lowercase letter');

  if (/\d/.test(password)) score += 15;
  else suggestions.push('Add a digit');

  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  else suggestions.push('Add a special character');

  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    suggestions.push('Avoid repeated characters (e.g., "aaa")');
  }

  // Check against common patterns
  const commonPatterns = [
    'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome',
    'monkey', 'dragon', 'master', 'abc123', 'passwrd',
  ];
  if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
    score -= 15;
    errors.push('Password contains a common pattern');
  }

  // Check keyboard sequences
  const keyboardSequences = ['qwerty', 'asdfgh', 'zxcvbn', 'qwertz', 'azerty'];
  if (keyboardSequences.some(s => password.toLowerCase().includes(s))) {
    score -= 10;
    errors.push('Password contains a keyboard sequence');
  }

  score = Math.max(0, Math.min(100, score));

  return {
    valid: errors.length === 0 && score >= 60,
    score,
    errors,
    suggestions,
  };
}

// ── 2FA / TOTP ──
import { authenticator } from 'otplib';

export function generateTwoFactorSecret(): { secret: string; otpauthUrl: string } {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(config.adminEmail || 'user@marketplace.com', 'MarketPlace', secret);
  return { secret, otpauthUrl };
}

export function verifyTwoFactorToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

// ── Fraud Detection (IP tracking, velocity checks) ──
interface RequestRecord {
  count: number;
  firstRequest: Date;
  lastRequest: Date;
  endpoints: Map<string, number>;
  userAgents: Set<string>;
}

const requestTracking = new Map<string, RequestRecord>();

export function trackRequest(ip: string, endpoint: string, userAgent: string): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const now = new Date();

  let record = requestTracking.get(ip);
  if (!record) {
    record = {
      count: 0,
      firstRequest: now,
      lastRequest: now,
      endpoints: new Map(),
      userAgents: new Set(),
    };
    requestTracking.set(ip, record);
  }

  record.count++;
  record.lastRequest = now;
  record.endpoints.set(endpoint, (record.endpoints.get(endpoint) || 0) + 1);
  record.userAgents.add(userAgent);

  // Cleanup old records periodically
  if (requestTracking.size > 10000) {
    const threshold = new Date(Date.now() - 86400000); // 24 hours
    for (const [key, value] of requestTracking.entries()) {
      if (value.lastRequest < threshold) {
        requestTracking.delete(key);
      }
    }
  }

  // Velocity check: more than 100 requests in 1 minute
  const timeDiff = (now.getTime() - record.firstRequest.getTime()) / 1000;
  if (timeDiff < 60 && record.count > 100) {
    reasons.push('Rate velocity exceeded');
  }

  // Multiple user agents from same IP
  if (record.userAgents.size > 3) {
    reasons.push('Multiple user agents detected');
  }

  // Rapid fire on auth endpoints
  const authHits = (record.endpoints.get('/api/auth/login') || 0) +
    (record.endpoints.get('/api/auth/register') || 0);
  if (authHits > 20 && timeDiff < 300) {
    reasons.push('Rapid authentication attempts');
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

// ── File Upload Validation ──
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
  '.pdf', '.csv', '.xlsx', '.xls',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFileUpload(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, error: `File type "${file.mimetype}" is not allowed` };
  }

  const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File extension "${ext}" is not allowed` };
  }

  return { valid: true };
}

// ── GDPR Compliance ──
export function generateDataExport(userData: Record<string, any>): Buffer {
  const exportData = {
    exportedAt: new Date().toISOString(),
    platform: 'MarketPlace',
    data: userData,
  };
  return Buffer.from(JSON.stringify(exportData, null, 2));
}

export function anonymizeEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${masked}@${domain}`;
}

export function generateCookieConsentHtml(): string {
  return `
    <div id="cookie-consent" style="position:fixed;bottom:0;left:0;right:0;background:#1f2937;color:#fff;padding:16px 24px;z-index:9999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <p style="margin:0;font-size:14px;">We use cookies to improve your experience. By continuing, you agree to our use of cookies.</p>
      <div style="display:flex;gap:8px;">
        <button onclick="localStorage.setItem('cookie-consent','all');document.getElementById('cookie-consent').style.display='none';" style="background:#ea580c;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:600;">Accept All</button>
        <button onclick="localStorage.setItem('cookie-consent','necessary');document.getElementById('cookie-consent').style.display='none';" style="background:transparent;color:#d1d5db;border:1px solid #6b7280;padding:8px 20px;border-radius:6px;cursor:pointer;">Necessary Only</button>
      </div>
    </div>
  `;
}