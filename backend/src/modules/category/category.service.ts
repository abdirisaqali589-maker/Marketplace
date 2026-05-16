import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import slugify from '../../common/slugify';
import { Prisma } from '@prisma/client';

export class CategoryService {
  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, isActive, parentId, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: {
          _count: { select: { products: true, children: true } },
          parent: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    return {
      data: categories.map(c => ({
        ...c,
        productCount: c._count.products,
        childCount: c._count.children,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundError('Category not found');
    return {
      ...category,
      productCount: category._count.products,
      _count: undefined,
    };
  }

  async findBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundError('Category not found');
    return {
      ...category,
      productCount: category._count.products,
      _count: undefined,
    };
  }

  async getTree() {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    });

    const buildTree = (parentId: string | null, items: typeof categories): any[] => {
      return items
        .filter(c => c.parentId === parentId)
        .map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image,
          level: c.level,
          sortOrder: c.sortOrder,
          productCount: c._count.products,
          children: buildTree(c.id, items),
        }));
    };

    return buildTree(null, categories);
  }

  async create(data: any) {
    const slug = data.slug || slugify(data.name);
    
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) throw new AppError(409, 'Category slug already exists');

    let level = 0;
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new NotFoundError('Parent category not found');
      level = parent.level + 1;
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId || null,
        level,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        filters: data.filters ? JSON.stringify(data.filters) : undefined,
        attributes: data.attributes ? JSON.stringify(data.attributes) : undefined,
        commissionRate: data.commissionRate,
      },
    });

    return category;
  }

  async update(id: string, data: any) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Category not found');

    let slug = data.slug;
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({ where: { slug } });
      if (slugExists) throw new AppError(409, 'Category slug already exists');
    }

    let level = existing.level;
    if (data.parentId && data.parentId !== existing.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new NotFoundError('Parent category not found');
      level = parent.level + 1;
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(slug !== undefined && { slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.parentId !== undefined && { parentId: data.parentId || null }),
        ...(data.level !== undefined && { level }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.filters !== undefined && { filters: JSON.stringify(data.filters) }),
        ...(data.attributes !== undefined && { attributes: JSON.stringify(data.attributes) }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
      },
    });

    // Update child levels if parent changed
    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
      await this.updateChildLevels(category.id, level + 1);
    }

    return category;
  }

  private async updateChildLevels(parentId: string, level: number) {
    const children = await prisma.category.findMany({ where: { parentId } });
    for (const child of children) {
      await prisma.category.update({
        where: { id: child.id },
        data: { level },
      });
      await this.updateChildLevels(child.id, level + 1);
    }
  }

  async delete(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) throw new NotFoundError('Category not found');
    if (category._count.products > 0) {
      throw new AppError(400, 'Cannot delete category with associated products');
    }
    if (category._count.children > 0) {
      throw new AppError(400, 'Cannot delete category with child categories');
    }
    await prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }

  async reorder(ids: string[]) {
    await Promise.all(
      ids.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return { message: 'Categories reordered successfully' };
  }

  async getFilters(categoryId: string) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundError('Category not found');
    const filters = category.filters ? JSON.parse(category.filters) : [];
    
    // Get all parent filters
    const allFilters = [...filters];
    if (category.parentId) {
      const parentFilters = await this.getFilters(category.parentId);
      allFilters.push(...parentFilters);
    }
    return allFilters;
  }

  async getAttributes(categoryId: string) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundError('Category not found');
    const attributes = category.attributes ? JSON.parse(category.attributes) : [];
    
    const allAttributes = [...attributes];
    if (category.parentId) {
      const parentAttrs = await this.getAttributes(category.parentId);
      allAttributes.push(...parentAttrs);
    }
    return allAttributes;
  }
}