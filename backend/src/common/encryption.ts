import crypto from 'crypto';
import { AppError } from './errors';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('WARNING: ENCRYPTION_KEY not set. Using fallback (not suitable for production).');
}

// Use a 32-byte key (AES-256). If ENCRYPTION_KEY is shorter, we hash it to get 32 bytes.
function getKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    return crypto.createHash('sha256').update('development-fallback-key-change-in-production').digest();
  }
  // Ensure key is exactly 32 bytes
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

const IV_LENGTH = 16; // AES block size

/**
 * Encrypt a plaintext string using AES-256-CBC.
 * Returns a base64-encoded string containing IV + ciphertext.
 */
export function encrypt(text: string): string {
  if (!text) return '';

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV to ciphertext
  const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted string back to plaintext.
 * Expects a base64-encoded string containing IV + ciphertext.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const key = getKey();
    const combined = Buffer.from(encryptedText, 'base64');

    if (combined.length < IV_LENGTH + 1) {
      throw new Error('Invalid encrypted data');
    }

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    throw new AppError(500, `Decryption failed: ${error.message}`);
  }
}

/**
 * Hash a value using SHA-256 (useful for fingerprinting keys without storing them).
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a secure random token.
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}