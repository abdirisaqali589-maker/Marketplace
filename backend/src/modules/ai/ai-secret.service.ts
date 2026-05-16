import { prisma } from '../../common/prisma';
import { encrypt, decrypt } from '../../common/encryption';
import { NotFoundError, AppError } from '../../common/errors';
import { logger } from '../../common/logger';

/**
 * SecureAISecretService
 *
 * Manages encryption and secure storage of AI provider API keys and secrets.
 * All sensitive credentials are encrypted at rest before being stored in the database.
 */

export class SecureAISecretService {
  /**
   * Encrypt and store/update an AI provider's API key.
   * The key is encrypted before storage; the encrypted blob is stored in the apiKey field.
   */
  async storeProviderKey(providerId: string, apiKey: string): Promise<void> {
    const encryptedKey = encrypt(apiKey);

    // Also store a hash for comparison (so we can detect if the key changed without decrypting)
    const keyHash = this.hashKey(apiKey);
    const existingConfig = await this.getExistingConfig(providerId);

    await prisma.aiProvider.update({
      where: { id: providerId },
      data: {
        apiKey: encryptedKey,
        config: JSON.stringify({
          ...existingConfig,
          keyFingerprint: keyHash,
          keyEncryptedAt: new Date().toISOString(),
        }),
      },
    });

    logger.info('Provider API key encrypted and stored', { providerId, keyFingerprint: keyHash });
  }

  /**
   * Decrypt and retrieve an AI provider's API key.
   * Returns null if no key is stored.
   */
  async retrieveProviderKey(providerId: string): Promise<string | null> {
    const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });

    if (!provider || !provider.apiKey) return null;

    // Try to decrypt; if it fails, it might be a legacy plaintext key
    try {
      return decrypt(provider.apiKey);
    } catch {
      // If decryption fails, assume it's a plaintext key (legacy or newly saved before encrypt was configured)
      // Re-encrypt it for future use
      logger.warn('Provider API key appears to be plaintext, re-encrypting', { providerId });
      try {
        const encrypted = encrypt(provider.apiKey);
        await prisma.aiProvider.update({
          where: { id: providerId },
          data: { apiKey: encrypted },
        });
        logger.info('Provider API key re-encrypted successfully', { providerId });
      } catch {
        logger.warn('Could not re-encrypt provider API key, returning plaintext', { providerId });
      }
      return provider.apiKey;
    }
  }

  /**
   * Retrieve a provider's API key for use in an AI request.
   * This is the main method used by AiService when making API calls.
   */
  async getProviderApiKey(providerSlug: string): Promise<string | null> {
    const provider = await prisma.aiProvider.findFirst({ where: { slug: providerSlug } });
    if (!provider) return null;

    const decrypted = await this.retrieveProviderKey(provider.id);
    return decrypted;
  }

  /**
   * Check if a provider has an API key configured.
   */
  async providerHasKey(providerId: string): Promise<boolean> {
    const provider = await prisma.aiProvider.findUnique({
      where: { id: providerId },
      select: { apiKey: true },
    });
    return !!provider?.apiKey;
  }

  /**
   * Remove/clear a provider's API key.
   */
  async removeProviderKey(providerId: string): Promise<void> {
    const existingConfig = await this.getExistingConfig(providerId);
    await prisma.aiProvider.update({
      where: { id: providerId },
      data: {
        apiKey: null,
        config: JSON.stringify({
          ...existingConfig,
          keyFingerprint: null,
          keyEncryptedAt: null,
        }),
      },
    });
  }

  /**
   * Store any sensitive secret (e.g., webhook signing secret, OAuth client secret).
   */
  async storeSecret(secretKey: string, secretValue: string): Promise<void> {
    const encrypted = encrypt(secretValue);
    const existing = await prisma.featureFlag.findUnique({ where: { key: secretKey } });

    const entry = {
      encrypted: true,
      value: encrypted,
      storedAt: new Date().toISOString(),
    };

    if (existing) {
      await prisma.featureFlag.update({
        where: { key: secretKey },
        data: { value: JSON.stringify(entry) },
      });
    } else {
      await prisma.featureFlag.create({
        data: {
          key: secretKey,
          value: JSON.stringify(entry),
          type: 'secret',
          description: `Encrypted secret: ${secretKey}`,
        },
      });
    }
  }

  /**
   * Retrieve a stored secret (decrypts automatically).
   */
  async retrieveSecret(secretKey: string): Promise<string | null> {
    const existing = await prisma.featureFlag.findUnique({ where: { key: secretKey } });

    if (!existing) return null;

    try {
      const parsed = JSON.parse(existing.value);
      if (parsed.encrypted && parsed.value) {
        return decrypt(parsed.value);
      }
      return parsed.value || existing.value;
    } catch {
      return existing.value;
    }
  }

  /**
   * Generate a hash fingerprint of an API key (for change detection).
   */
  hashKey(apiKey: string): string {
    // Use first 8 chars of SHA-256 for fingerprinting
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }

  private async getExistingConfig(providerId: string): Promise<Record<string, any>> {
    try {
      const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
      if (provider?.config) {
        try {
          return JSON.parse(provider.config);
        } catch {
          return {};
        }
      }
    } catch {
      // ignore
    }
    return {};
  }
}

export const secretService = new SecureAISecretService();