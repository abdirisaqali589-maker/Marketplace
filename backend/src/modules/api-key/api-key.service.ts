import crypto from 'crypto';
import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

const KEY_PREFIX = 'mkp';

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export class ApiKeyService {
  private generateKey() {
    return `${KEY_PREFIX}_${crypto.randomBytes(32).toString('base64url')}`;
  }

  async create(data: { name: string; userId?: string; permissions?: string[]; expiresAt?: string | Date }) {
    if (!data.name?.trim()) throw new AppError(400, 'API key name is required');

    const plainKey = this.generateKey();
    const record = await prisma.apiKey.create({
      data: {
        name: data.name.trim(),
        key: hashKey(plainKey),
        userId: data.userId || null,
        permissions: JSON.stringify(data.permissions || []),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    return { ...this.withoutSecret(record), key: plainKey };
  }

  async findAll(query: { page?: number | string; limit?: number | string; isActive?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: any = {};

    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;

    const [keys, total] = await Promise.all([
      prisma.apiKey.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.apiKey.count({ where }),
    ]);

    return {
      data: keys.map((key) => this.withoutSecret(key)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async validate(plainKey: string, requiredPermission?: string) {
    const key = await prisma.apiKey.findUnique({ where: { key: hashKey(plainKey) } });
    if (!key || !key.isActive) throw new AppError(401, 'Invalid API key');
    if (key.expiresAt && key.expiresAt < new Date()) throw new AppError(401, 'API key has expired');

    const permissions = key.permissions ? JSON.parse(key.permissions) as string[] : [];
    if (requiredPermission && !permissions.includes('*') && !permissions.includes(requiredPermission)) {
      throw new AppError(403, 'API key does not have the required permission');
    }

    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return { ...this.withoutSecret(key), permissions };
  }

  async revoke(id: string) {
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundError('API key not found');
    return this.withoutSecret(await prisma.apiKey.update({ where: { id }, data: { isActive: false } }));
  }

private withoutSecret(key: any) {
     const { key: _secret, ...rest } = key;
     // Parse permissions from JSON string to array
     if (rest.permissions && typeof rest.permissions === 'string') {
       try { rest.permissions = JSON.parse(rest.permissions); } catch { rest.permissions = []; }
     }
     return rest;
   }
}
