import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import slugify from '../../common/slugify';

export class BrandService {
  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, isApproved } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) { where.OR = [{ name: { contains: search } }, { description: { contains: search } }]; }
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({ where, include: { _count: { select: { products: true } } }, orderBy: { name: 'asc' }, skip, take: limit }),
      prisma.brand.count({ where }),
    ]);

    return { data: brands, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const brand = await prisma.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!brand) throw new NotFoundError('Brand not found');
    return brand;
  }

  async create(data: any) {
    const slug = data.slug || slugify(data.name);
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) throw new AppError(409, 'Brand slug already exists');
    return prisma.brand.create({ data: { name: data.name, slug, logo: data.logo, description: data.description, isApproved: data.isApproved ?? false } });
  }

  async update(id: string, data: any) {
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundError('Brand not found');
    let slug = data.slug;
    if (slug && slug !== brand.slug) {
      const slugExists = await prisma.brand.findUnique({ where: { slug } });
      if (slugExists) throw new AppError(409, 'Brand slug already exists');
    }
    return prisma.brand.update({ where: { id }, data: { ...(data.name !== undefined && { name: data.name }), ...(slug !== undefined && { slug }), ...(data.logo !== undefined && { logo: data.logo }), ...(data.description !== undefined && { description: data.description }), ...(data.isApproved !== undefined && { isApproved: data.isApproved }) } });
  }

  async delete(id: string) {
    const brand = await prisma.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!brand) throw new NotFoundError('Brand not found');
    if (brand._count.products > 0) throw new AppError(400, 'Cannot delete brand with associated products');
    await prisma.brand.delete({ where: { id } });
    return { message: 'Brand deleted' };
  }
}