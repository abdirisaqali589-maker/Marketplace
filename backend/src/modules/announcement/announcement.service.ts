import { prisma } from '../../common/prisma';
import { NotFoundError } from '../../common/errors';

export class AnnouncementService {
  async create(data: { title: string; body: string; type?: string; startsAt?: string; expiresAt?: string }) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        type: data.type || 'INFO',
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async findAll(query: any) {
    const { page = 1, limit = 20, isActive, type } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (type) where.type = type;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      data: announcements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getActive() {
    const now = new Date();
    return prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { startsAt: null, expiresAt: null },
          { startsAt: null, expiresAt: { gte: now } },
          { startsAt: { lte: now }, expiresAt: null },
          { startsAt: { lte: now }, expiresAt: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: any) {
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundError('Announcement not found');

    const updateData: any = { ...data };
    if (data.startsAt) updateData.startsAt = new Date(data.startsAt);
    if (data.expiresAt) updateData.expiresAt = new Date(data.expiresAt);

    return prisma.announcement.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    await prisma.announcement.delete({ where: { id } });
    return { message: 'Announcement deleted' };
  }

  async toggleActive(id: string) {
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundError('Announcement not found');
    return prisma.announcement.update({
      where: { id },
      data: { isActive: !announcement.isActive },
    });
  }
}