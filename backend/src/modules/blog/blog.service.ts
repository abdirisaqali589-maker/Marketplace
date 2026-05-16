import { prisma } from '../../common/prisma';
import slugify from '../../common/slugify';
import { NotFoundError } from '../../common/errors';

export class BlogService {
  async create(data: { title: string; content: string; excerpt?: string; coverImage?: string; category?: string; tags?: string[]; authorId: string; authorName: string }) {
    const slug = slugify(data.title);
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return prisma.blogPost.create({
        data: {
          ...data,
          slug: `${slug}-${Date.now()}`,
          tags: data.tags ? JSON.stringify(data.tags) : null,
        },
      });
    }
    return prisma.blogPost.create({
      data: {
        ...data,
        slug,
        tags: data.tags ? JSON.stringify(data.tags) : null,
      },
    });
  }

  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { status, category, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return {
      data: posts.map(p => ({
        ...p,
        tags: p.tags ? JSON.parse(p.tags) : [],
        content: p.status === 'PUBLISHED' || query.showFull ? p.content : p.content.substring(0, 200) + '...',
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const post = await prisma.blogPost.findUnique({ where: { slug } });
    if (!post) throw new NotFoundError('Blog post not found');
    return { ...post, tags: post.tags ? JSON.parse(post.tags) : [] };
  }

  async findById(id: string) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Blog post not found');
    return { ...post, tags: post.tags ? JSON.parse(post.tags) : [] };
  }

  async update(id: string, data: any) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Blog post not found');

    const updateData: any = { ...data };
    if (data.tags) updateData.tags = JSON.stringify(data.tags);
    if (data.status === 'PUBLISHED' && !post.publishedAt) {
      updateData.publishedAt = new Date();
    }

    return prisma.blogPost.update({
      where: { id },
      data: updateData,
    });
  }

  async publish(id: string) {
    return prisma.blogPost.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async delete(id: string) {
    await prisma.blogPost.delete({ where: { id } });
    return { message: 'Blog post deleted' };
  }

  async getPublishedPosts(page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, title: true, slug: true, excerpt: true, coverImage: true,
          authorName: true, category: true, tags: true, publishedAt: true, createdAt: true,
        },
      }),
      prisma.blogPost.count({ where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } } }),
    ]);

    return {
      data: posts.map(p => ({ ...p, tags: p.tags ? JSON.parse(p.tags) : [] })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCategories() {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { category: true },
      distinct: ['category'],
    });
    return posts.filter(p => p.category).map(p => p.category);
  }
}