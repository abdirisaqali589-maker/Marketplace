import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import slugify from '../../common/slugify';
import { Prisma } from '@prisma/client';
import { AuthPayload } from '../../common/middleware';
import { MeiliSearch } from 'meilisearch';
import { config } from '../../common/config';
import ExcelJS from 'exceljs';

export class ProductService {
  private searchClient = config.meilisearchKey
    ? new MeiliSearch({ host: config.meilisearchUrl, apiKey: config.meilisearchKey })
    : null;

  private isAdmin(user: AuthPayload): boolean {
    return ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  }

  private async getSellerIdForUser(userId: string): Promise<string> {
    const seller = await prisma.seller.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seller) throw new NotFoundError('Seller profile not found');
    return seller.id;
  }

  private async ensureCanMutateProduct(productSellerId: string, user: AuthPayload) {
    if (this.isAdmin(user)) return;
    const sellerId = await this.getSellerIdForUser(user.userId);
    if (productSellerId !== sellerId) throw new AppError(403, 'Not authorized');
  }

  async findAll(query: any) {
    const { page, limit, search, categoryId, brandId, sellerId, minPrice, maxPrice, status, isActive, isFeatured, sortBy, sortOrder, inStock, rating } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';
    if (minPrice !== undefined) where.basePrice = { ...where.basePrice as any, gte: minPrice };
    if (maxPrice !== undefined) where.basePrice = { ...where.basePrice as any, lte: maxPrice };
    if (rating !== undefined) where.rating = { gte: rating };
    if (inStock === 'true') {
      where.variants = { some: { stock: { gt: 0 }, isActive: true } };
    } else if (inStock === 'false') {
      where.variants = { none: { stock: { gt: 0 }, isActive: true } };
    }

    const orderBy = sortBy && sortOrder ? { [sortBy]: sortOrder } : { updatedAt: 'desc' as const };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 5 },
          variants: { where: { isActive: true }, select: { id: true, sku: true, price: true, discountPrice: true, stock: true, attributes: true } },
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, storeName: true, storeSlug: true } },
          brand: { select: { id: true, name: true, slug: true, logo: true } },
          _count: { select: { reviews: true, wishlistItems: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        category: { select: { id: true, name: true, slug: true, filters: true, attributes: true } },
        seller: { select: { id: true, storeName: true, storeSlug: true, storeLogo: true, rating: true, responseRate: true } },
        brand: { select: { id: true, name: true, slug: true, logo: true } },
        _count: { select: { reviews: true, wishlistItems: true } },
      },
    });
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  async findBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        category: { select: { id: true, name: true, slug: true, filters: true, attributes: true } },
        seller: { select: { id: true, storeName: true, storeSlug: true, storeLogo: true, rating: true, responseRate: true } },
        brand: { select: { id: true, name: true, slug: true, logo: true } },
        _count: { select: { reviews: true, wishlistItems: true } },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            images: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  async findSellerProducts(userId: string, query: any) {
    const sellerId = await this.getSellerIdForUser(userId);
    return this.findAll({ ...query, sellerId });
  }

  async create(data: any, userId: string) {
    const sellerId = await this.getSellerIdForUser(userId);
    const slug = data.slug || slugify(data.title);

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) throw new AppError(409, 'Product slug already exists');

    const product = await prisma.product.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        sellerId,
        basePrice: data.basePrice,
        discountPrice: data.discountPrice || null,
        costPrice: data.costPrice || null,
        currency: data.currency || 'TZS',
        status: data.status === 'ACTIVE' ? 'PENDING_REVIEW' : (data.status || 'PENDING_REVIEW'),
        isFeatured: data.isFeatured ?? false,
        specifications: data.specifications ? JSON.stringify(data.specifications) : null,
        images: data.images ? {
          create: data.images.map((img: any, idx: number) => ({
            url: img.url,
            alt: img.alt,
            isPrimary: img.isPrimary ?? idx === 0,
            sortOrder: img.sortOrder ?? idx,
          })),
        } : undefined,
        variants: data.variants ? {
          create: data.variants.map((v: any) => ({
            sku: v.sku,
            barcode: v.barcode,
            attributes: v.attributes ? JSON.stringify(v.attributes) : null,
            price: v.price,
            discountPrice: v.discountPrice || null,
            stock: v.stock ?? 0,
            lowStockThreshold: v.lowStockThreshold ?? 5,
            weight: v.weight || null,
            dimensions: v.dimensions ? JSON.stringify(v.dimensions) : null,
            isActive: v.isActive ?? true,
          })),
        } : undefined,
      },
      include: {
        images: true,
        variants: true,
        category: { select: { id: true, name: true } },
      },
    });

    await this.indexProduct(product.id);
    return product;
  }

  async update(id: string, data: any, user: AuthPayload) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Product not found');
    await this.ensureCanMutateProduct(existing.sellerId, user);

    let slug = data.slug;
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.product.findUnique({ where: { slug } });
      if (slugExists) throw new AppError(409, 'Product slug already exists');
    }

    // Handle images replacement if provided
    if (data.images) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.productImage.createMany({
        data: data.images.map((img: any, idx: number) => ({
          productId: id,
          url: img.url,
          alt: img.alt,
          isPrimary: img.isPrimary ?? idx === 0,
          sortOrder: img.sortOrder ?? idx,
        })),
      });
    }

    // Handle variants replacement if provided
    if (data.variants) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      await prisma.productVariant.createMany({
        data: data.variants.map((v: any) => ({
          productId: id,
          sku: v.sku,
          barcode: v.barcode,
          attributes: v.attributes ? JSON.stringify(v.attributes) : null,
          price: v.price,
          discountPrice: v.discountPrice || null,
          stock: v.stock ?? 0,
          lowStockThreshold: v.lowStockThreshold ?? 5,
          weight: v.weight || null,
          dimensions: v.dimensions ? JSON.stringify(v.dimensions) : null,
          isActive: v.isActive ?? true,
        })),
      });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(slug !== undefined && { slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
        ...(data.brandId !== undefined && { brandId: data.brandId || null }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.discountPrice !== undefined && { discountPrice: data.discountPrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.specifications !== undefined && { specifications: JSON.stringify(data.specifications) }),
      },
      include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true },
    });

    await this.indexProduct(product.id);
    return product;
  }

  async updateStock(variantId: string, quantity: number, user: AuthPayload) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { sellerId: true } } },
    });
    if (!variant) throw new NotFoundError('Variant not found');
    await this.ensureCanMutateProduct(variant.product.sellerId, user);

    const newStock = variant.stock + quantity; // quantity can be negative for deduction
    if (newStock < 0) throw new AppError(400, 'Insufficient stock');

    return prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: newStock },
    });
  }

  async approveProduct(id: string, status: 'ACTIVE' | 'REJECTED' | 'PENDING_REVIEW', reason?: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');
    const updated = await prisma.product.update({
      where: { id },
      data: {
        status,
        isActive: status === 'ACTIVE',
        searchVector: reason ? JSON.stringify({ approvalReason: reason, reviewedAt: new Date().toISOString() }) : product.searchVector,
      },
    });
    await this.indexProduct(updated.id);
    return updated;
  }

  async getAttributeTemplate(categoryId?: string, slug?: string) {
    const category = categoryId || slug
      ? await prisma.category.findFirst({ where: categoryId ? { id: categoryId } : { slug } })
      : null;
    const key = `${category?.slug || ''} ${category?.name || ''}`.toLowerCase();
    const defaults = key.includes('cloth') || key.includes('fashion') || key.includes('shoe')
      ? [
          { key: 'size', label: 'Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
          { key: 'color', label: 'Color', type: 'text' },
          { key: 'material', label: 'Material', type: 'text' },
          { key: 'fit', label: 'Fit', type: 'select', options: ['Slim', 'Regular', 'Relaxed'] },
        ]
      : key.includes('phone') || key.includes('electronic') || key.includes('computer')
        ? [
            { key: 'brand', label: 'Brand', type: 'text' },
            { key: 'model', label: 'Model', type: 'text' },
            { key: 'storage', label: 'Storage', type: 'text' },
            { key: 'ram', label: 'RAM', type: 'text' },
            { key: 'screenSize', label: 'Screen size', type: 'text' },
            { key: 'warranty', label: 'Warranty', type: 'text' },
          ]
        : [
            { key: 'brand', label: 'Brand', type: 'text' },
            { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Used', 'Refurbished'] },
            { key: 'warranty', label: 'Warranty', type: 'text' },
          ];
    const saved = category?.attributes ? JSON.parse(category.attributes) : [];
    return { category, attributes: saved.length ? saved : defaults };
  }

  async previewImport(userId: string, data: { fileName?: string; content: string; format?: string; rows?: Record<string, string>[] }) {
    const sellerId = await this.getSellerIdForUser(userId);
    const rows = data.rows || await this.parseImportRows(data.content, data.format || data.fileName);
    const preview = rows.map((row, index) => {
      const errors: string[] = [];
      if (!row.title) errors.push('title is required');
      if (!row.description) errors.push('description is required');
      if (!row.basePrice || Number.isNaN(Number(row.basePrice)) || Number(row.basePrice) <= 0) errors.push('basePrice must be a positive number');
      if (!row.sku) errors.push('sku is required');
      if (row.stock && Number.isNaN(Number(row.stock))) errors.push('stock must be numeric');
      return {
        rowNumber: index + 2,
        rawData: row,
        status: errors.length ? 'INVALID' : 'VALID',
        errors,
        warnings: row.categorySlug || row.categoryId ? [] : ['category is empty'],
      };
    });
    const job = await prisma.productImportJob.create({
      data: {
        sellerId,
        fileName: data.fileName,
        totalRows: preview.length,
        validRows: preview.filter(row => row.status === 'VALID').length,
        invalidRows: preview.filter(row => row.status === 'INVALID').length,
        summary: JSON.stringify({ format: data.format || 'csv' }),
        rows: {
          create: preview.map(row => ({
            rowNumber: row.rowNumber,
            rawData: JSON.stringify(row.rawData),
            errors: JSON.stringify(row.errors),
            warnings: JSON.stringify(row.warnings),
            status: row.status,
          })),
        },
      },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });
    return {
      ...job,
      rows: job.rows.map(row => ({
        ...row,
        rawData: JSON.parse(row.rawData),
        errors: row.errors ? JSON.parse(row.errors) : [],
        warnings: row.warnings ? JSON.parse(row.warnings) : [],
      })),
    };
  }

  async runInventoryAutomation(userId?: string) {
    const where: any = userId ? { product: { seller: { userId } } } : {};
    const variants = await prisma.productVariant.findMany({
      where,
      include: { product: { include: { seller: true } } },
    });
    const lowStock = variants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold);
    const outOfStock = variants.filter(v => v.stock <= 0);
    await Promise.all(outOfStock.map(v => prisma.product.update({
      where: { id: v.productId },
      data: { isActive: false, status: 'INACTIVE' },
    })));
    await prisma.notification.createMany({
      data: lowStock.map(v => ({
        userId: v.product.seller.userId,
        type: 'LOW_STOCK',
        title: `${v.product.title} is running low`,
        body: `${v.sku} has ${v.stock} left. Reorder soon or adjust stock.`,
        data: JSON.stringify({ productId: v.productId, variantId: v.id, stock: v.stock }),
      })),
    });
    return {
      lowStockAlerts: lowStock.length,
      unpublishedProducts: outOfStock.length,
      reorderPrompts: lowStock.map(v => ({ productId: v.productId, variantId: v.id, sku: v.sku, stock: v.stock, threshold: v.lowStockThreshold })),
    };
  }

  async runSearchIndexJob(filters: any) {
    const job = await prisma.searchIndexJob.create({ data: { status: 'RUNNING', filters: JSON.stringify(filters || {}), startedAt: new Date() } });
    const where: any = { isActive: true, status: 'ACTIVE' };
    if (filters?.sellerId) where.sellerId = filters.sellerId;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    const products = await prisma.product.findMany({ where, select: { id: true } });
    const errors: string[] = [];
    let indexedItems = 0;
    for (const product of products) {
      try {
        await this.indexProduct(product.id);
        indexedItems++;
      } catch (error) {
        errors.push(`${product.id}: ${(error as Error).message}`);
      }
    }
    return prisma.searchIndexJob.update({
      where: { id: job.id },
      data: {
        status: errors.length ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        totalItems: products.length,
        indexedItems,
        errors: errors.length ? JSON.stringify(errors) : null,
        finishedAt: new Date(),
      },
    });
  }

  async toggleFeatured(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');

    return prisma.product.update({
      where: { id },
      data: { isFeatured: !product.isFeatured },
    });
  }

  async toggleActive(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');

    return prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
  }

  async delete(id: string, user: AuthPayload) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');
    await this.ensureCanMutateProduct(product.sellerId, user);

    await prisma.product.delete({ where: { id } });
    await this.removeProductFromIndex(id);
    return { message: 'Product deleted successfully' };
  }

  async getFeatured() {
    return prisma.product.findMany({
      where: { isFeatured: true, isActive: true, status: 'ACTIVE' },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  async searchProducts(searchTerm: string, query: any) {
    if (this.searchClient && searchTerm.trim()) {
      try {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const result = await this.searchClient.index('products').search(searchTerm, {
          limit,
          offset: (page - 1) * limit,
          filter: ['isActive = true', 'status = ACTIVE'],
        });
        const ids = result.hits.map((hit: any) => hit.id);
        if (ids.length) {
          const products = await prisma.product.findMany({
            where: { id: { in: ids } },
            include: {
              images: { orderBy: { sortOrder: 'asc' }, take: 5 },
              variants: { where: { isActive: true }, select: { id: true, sku: true, price: true, discountPrice: true, stock: true, attributes: true } },
              category: { select: { id: true, name: true, slug: true } },
              seller: { select: { id: true, storeName: true, storeSlug: true } },
              brand: { select: { id: true, name: true, slug: true, logo: true } },
              _count: { select: { reviews: true, wishlistItems: true } },
            },
          });
          return {
            data: ids.map((id: string) => products.find(product => product.id === id)).filter(Boolean),
            pagination: { page, limit, total: result.estimatedTotalHits || products.length, totalPages: Math.ceil((result.estimatedTotalHits || products.length) / limit) },
          };
        }
      } catch {
        // Search service is optional in development; fall back to database search.
      }
    }
    return this.findAll({ ...query, search: searchTerm });
  }

  async getQuestions(productId: string) {
    return prisma.productQuestion.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async askQuestion(productId: string, userId: string, question: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive || product.status !== 'ACTIVE') throw new NotFoundError('Product not found');
    return prisma.productQuestion.create({ data: { productId, userId, question } });
  }

  async answerQuestion(questionId: string, user: AuthPayload, answer: string) {
    const question = await prisma.productQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundError('Question not found');
    const product = await prisma.product.findUnique({
      where: { id: question.productId },
      select: { sellerId: true },
    });
    if (!product) throw new NotFoundError('Product not found');
    await this.ensureCanMutateProduct(product.sellerId, user);
    return prisma.productQuestion.update({
      where: { id: questionId },
      data: { answer, answeredBy: user.userId, answeredAt: new Date() },
    });
  }

  private async indexProduct(productId: string) {
    if (!this.searchClient) return;
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true, slug: true } },
          seller: { select: { storeName: true, storeSlug: true } },
        },
      });
      if (!product) return;
      await this.searchClient.index('products').addDocuments([{
        id: product.id,
        title: product.title,
        description: product.description,
        category: product.category?.name,
        brand: product.brand?.name,
        seller: product.seller.storeName,
        basePrice: product.basePrice,
        discountPrice: product.discountPrice,
        rating: product.rating,
        totalSales: product.totalSales,
        status: product.status,
        isActive: product.isActive,
      }]);
    } catch {
      // Keep write paths healthy if search is offline.
    }
  }

  private parseDelimitedRows(content: string) {
    const lines = content.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = this.splitDelimitedLine(lines[0], delimiter).map(value => value.trim());
    return lines.slice(1).map(line => {
      const values = this.splitDelimitedLine(line, delimiter);
      return headers.reduce((row: Record<string, string>, header, index) => {
        row[header] = values[index]?.trim() || '';
        return row;
      }, {});
    });
  }

  private async parseImportRows(content: string, format?: string) {
    const lowerFormat = (format || '').toLowerCase();
    if (lowerFormat.endsWith('.xlsx') || lowerFormat === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(content, 'base64') as any);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) return [];
      const headers = this.normalizeExcelValues(worksheet.getRow(1).values).map(value => String(value).trim());
      const rows: Record<string, string>[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = this.normalizeExcelValues(row.values);
        rows.push(headers.reduce((record: Record<string, string>, header, index) => {
          record[header] = values[index] === undefined || values[index] === null ? '' : String(values[index]);
          return record;
        }, {}));
      });
      return rows;
    }
    return this.parseDelimitedRows(content);
  }

  private normalizeExcelValues(values: ExcelJS.CellValue[] | { [key: string]: ExcelJS.CellValue }) {
    return Array.isArray(values) ? values.slice(1) : Object.values(values);
  }

  private splitDelimitedLine(line: string, delimiter: string) {
    const values: string[] = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  private async removeProductFromIndex(productId: string) {
    if (!this.searchClient) return;
    try {
      await this.searchClient.index('products').deleteDocument(productId);
    } catch {
      // Keep write paths healthy if search is offline.
    }
  }
}
