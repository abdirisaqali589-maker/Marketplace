import { prisma } from '../../common/prisma';
import { NotFoundError } from '../../common/errors';
import slugify from '../../common/slugify';

export class PagesService {
  async create(data: {
    title: string;
    content: string;
    excerpt?: string;
    coverImage?: string;
    category?: string;
    authorId?: string;
    authorName?: string;
  }) {
    const slug = slugify(data.title);
    const existing = await prisma.staticPage.findUnique({ where: { slug } });
    if (existing) {
      return prisma.staticPage.create({
        data: {
          ...data,
          slug: `${slug}-${Date.now()}`,
        },
      });
    }
    return prisma.staticPage.create({ data: { ...data, slug } });
  }

  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { status, category, search, isPublished } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [pages, total] = await Promise.all([
      prisma.staticPage.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.staticPage.count({ where }),
    ]);

    return {
      data: pages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const page = await prisma.staticPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundError('Page not found');
    return page;
  }

  async findById(id: string) {
    const page = await prisma.staticPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundError('Page not found');
    return page;
  }

  async findByCategory(category: string) {
    const pages = await prisma.staticPage.findMany({
      where: { category, isPublished: true, status: 'PUBLISHED' },
      orderBy: { title: 'asc' },
    });
    return pages;
  }

  async update(id: string, data: any) {
    const page = await prisma.staticPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundError('Page not found');

    const updateData: any = { ...data };
    if (data.status === 'PUBLISHED' && !page.publishedAt) {
      updateData.publishedAt = new Date();
      updateData.isPublished = true;
    }
    if (data.status === 'DRAFT') {
      updateData.isPublished = false;
    }

    return prisma.staticPage.update({
      where: { id },
      data: updateData,
    });
  }

  async publish(id: string) {
    return prisma.staticPage.update({
      where: { id },
      data: { status: 'PUBLISHED', isPublished: true, publishedAt: new Date() },
    });
  }

  async unpublish(id: string) {
    return prisma.staticPage.update({
      where: { id },
      data: { status: 'DRAFT', isPublished: false },
    });
  }

  async delete(id: string) {
    await prisma.staticPage.delete({ where: { id } });
    return { message: 'Page deleted' };
  }

  async getPublishedByCategory(category: string) {
    return prisma.staticPage.findMany({
      where: { category, isPublished: true, status: 'PUBLISHED' },
      orderBy: { title: 'asc' },
      select: {
        id: true, title: true, slug: true, excerpt: true,
        coverImage: true, category: true, publishedAt: true, updatedAt: true,
      },
    });
  }
}