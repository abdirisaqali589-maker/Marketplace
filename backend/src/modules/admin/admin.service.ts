import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

export class AdminService {
  async getDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, totalSellers, totalOrders, totalProducts,
      totalRevenue, monthlyRevenue, ordersByStatus, recentOrders,
      pendingSellers, pendingReturns,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.seller.count(),
      prisma.order.count(),
      prisma.product.count(),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED', createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true } }),
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { firstName: true, lastName: true, email: true } }, seller: { select: { storeName: true } } } }),
      prisma.seller.count({ where: { kycStatus: 'PENDING' } }),
      prisma.returnRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      stats: {
        totalUsers, totalSellers, totalOrders, totalProducts,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
        pendingSellers, pendingReturns,
      },
      ordersByStatus: ordersByStatus.reduce((acc: any, item) => { acc[item.status] = item._count; return acc; }, {}),
      recentOrders,
    };
  }

  async getUsers(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, role, isActive } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) where.OR = [{ email: { contains: search } }, { firstName: { contains: search } }, { lastName: { contains: search } }, { phone: { contains: search } }];
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true, isActive: true, isVerified: true, kycStatus: true, createdAt: true, seller: { select: { storeName: true, kycStatus: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    return { data: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getUserDetail(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true, seller: true, orders: { take: 5, orderBy: { createdAt: 'desc' } },
        _count: { select: { orders: true, reviews: true, returnRequests: true, notifications: true } },
      },
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async toggleUserStatus(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');
    return prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  }

  async getRoles() {
    return prisma.adminRole.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: 'asc' } });
  }

  async createRole(data: any) {
    const existing = await prisma.adminRole.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError(409, 'Role already exists');
    return prisma.adminRole.create({ data: { name: data.name, description: data.description, permissions: data.permissions ? JSON.stringify(data.permissions) : undefined } });
  }

  async updateRole(id: string, data: any) {
    const role = await prisma.adminRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');
    return prisma.adminRole.update({ where: { id }, data: { ...(data.name !== undefined && { name: data.name }), ...(data.description !== undefined && { description: data.description }), ...(data.permissions !== undefined && { permissions: JSON.stringify(data.permissions) }) } });
  }

  async deleteRole(id: string) {
    const role = await prisma.adminRole.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) throw new AppError(400, 'Cannot delete system role');
    if (role._count.users > 0) throw new AppError(400, 'Cannot delete role with assigned users');
    await prisma.adminRole.delete({ where: { id } });
    return { message: 'Role deleted' };
  }

  async assignRole(userId: string, roleId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    const role = await prisma.adminRole.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role not found');

    const existing = await prisma.adminUser.findUnique({ where: { userId } });
    if (existing) {
      return prisma.adminUser.update({ where: { userId }, data: { roleId } });
    }
    return prisma.adminUser.create({ data: { userId, roleId } });
  }

  async getAuditLogs(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { action, entity } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { data: logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async verifySeller(sellerId: string) {
    const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundError('Seller not found');
    return prisma.seller.update({ where: { id: sellerId }, data: { kycStatus: 'VERIFIED', isVerified: true } });
  }

  async rejectSeller(sellerId: string, reason: string) {
    const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundError('Seller not found');
    return prisma.seller.update({ where: { id: sellerId }, data: { kycStatus: 'REJECTED', kycDocuments: reason ? JSON.stringify({ rejectionReason: reason }) : undefined } });
  }
}