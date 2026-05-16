import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  main?: string;
  permissions?: string[];
  hooks?: string[];
}

export class PluginService {
  async create(data: {
    name: string;
    slug: string;
    version: string;
    description?: string;
    author?: string;
    homepage?: string;
    manifest?: PluginManifest;
    scopes?: string[];
    webhookUrls?: string[];
    settings?: Record<string, any>;
  }) {
    const existing = await prisma.plugin.findFirst({
      where: { OR: [{ name: data.name }, { slug: data.slug }] },
    });
    if (existing) throw new AppError(409, 'Plugin with this name or slug already exists');

    const manifest = data.manifest || { name: data.name, version: data.version };
    const plugin = await prisma.plugin.create({
      data: {
        name: data.name,
        slug: data.slug,
        version: data.version,
        description: data.description || null,
        author: data.author || null,
        homepage: data.homepage || null,
        manifest: JSON.stringify(manifest),
        scopes: JSON.stringify(data.scopes || []),
        webhookUrls: JSON.stringify(data.webhookUrls || []),
        settings: data.settings ? JSON.stringify(data.settings) : null,
      },
    });
    return this.sanitize(plugin);
  }

  async findAll(query: { page?: number; limit?: number; isEnabled?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: Record<string, any> = {};

    if (query.isEnabled === 'true') where.isEnabled = true;
    if (query.isEnabled === 'false') where.isEnabled = false;

    const [plugins, total] = await Promise.all([
      prisma.plugin.findMany({ where, orderBy: { installedAt: 'desc' }, skip, take: limit }),
      prisma.plugin.count({ where }),
    ]);

    return {
      data: plugins.map(p => this.sanitize(p)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const plugin = await prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundError('Plugin not found');
    return this.sanitize(plugin);
  }

  async update(id: string, data: {
    description?: string;
    version?: string;
    manifest?: PluginManifest;
    scopes?: string[];
    webhookUrls?: string[];
    settings?: Record<string, any>;
  }) {
    const plugin = await prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundError('Plugin not found');

    const updateData: Record<string, any> = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.version !== undefined) updateData.version = data.version;
    if (data.manifest !== undefined) updateData.manifest = JSON.stringify(data.manifest);
    if (data.scopes !== undefined) updateData.scopes = JSON.stringify(data.scopes);
    if (data.webhookUrls !== undefined) updateData.webhookUrls = JSON.stringify(data.webhookUrls);
    if (data.settings !== undefined) updateData.settings = JSON.stringify(data.settings);

    const updated = await prisma.plugin.update({ where: { id }, data: updateData });
    return this.sanitize(updated);
  }

  async remove(id: string) {
    const plugin = await prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundError('Plugin not found');
    if (plugin.isSystem) throw new AppError(400, 'Cannot uninstall system plugins');

    await prisma.plugin.delete({ where: { id } });
    return { success: true, message: 'Plugin uninstalled' };
  }

  async toggleEnabled(id: string) {
    const plugin = await prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundError('Plugin not found');

    const updated = await prisma.plugin.update({
      where: { id },
      data: { isEnabled: !plugin.isEnabled },
    });
    return this.sanitize(updated);
  }

  async getWebhookUrls(eventType?: string) {
    const plugins = await prisma.plugin.findMany({
      where: { isEnabled: true },
    });

    const results: { plugin: string; urls: string[] }[] = [];
    for (const plugin of plugins) {
      const urls: string[] = JSON.parse(plugin.webhookUrls || '[]');
      if (urls.length > 0) {
        results.push({ plugin: plugin.slug, urls });
      }
    }
    return results;
  }

  private sanitize(plugin: any) {
    return {
      id: plugin.id,
      name: plugin.name,
      slug: plugin.slug,
      description: plugin.description,
      version: plugin.version,
      author: plugin.author,
      homepage: plugin.homepage,
      manifest: JSON.parse(plugin.manifest || '{}'),
      scopes: JSON.parse(plugin.scopes || '[]'),
      webhookUrls: JSON.parse(plugin.webhookUrls || '[]'),
      settings: plugin.settings ? JSON.parse(plugin.settings) : null,
      isEnabled: plugin.isEnabled,
      isSystem: plugin.isSystem,
      installedAt: plugin.installedAt,
      updatedAt: plugin.updatedAt,
    };
  }
}