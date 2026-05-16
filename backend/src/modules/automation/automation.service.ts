import { prisma } from '../../common/prisma';

export class AutomationService {
  async runMarketplaceAutomation() {
    const now = Date.now();
    const abandonedSince = new Date(now - 24 * 60 * 60 * 1000);
    const staleOrderSince = new Date(now - 48 * 60 * 60 * 1000);

    const [carts, staleOrders, unpaidOrders, sellers] = await Promise.all([
      prisma.cart.findMany({
        where: { updatedAt: { lte: abandonedSince }, items: { some: {} } },
        include: { user: true, items: { take: 3, include: { product: { select: { title: true } } } } },
        take: 100,
      }),
      prisma.order.findMany({
        where: { createdAt: { lte: staleOrderSince }, status: { in: ['PAYMENT_CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'] } },
        include: { seller: true },
        take: 100,
      }),
      prisma.order.findMany({
        where: { paymentStatus: 'PENDING', createdAt: { lte: abandonedSince } },
        take: 100,
      }),
      prisma.seller.findMany({ where: { isActive: true }, take: 100 }),
    ]);

    await prisma.notification.createMany({
      data: carts.map(cart => ({
        userId: cart.userId,
        type: 'ABANDONED_CART',
        title: 'Your cart is waiting',
        body: cart.items.map(item => item.product.title).join(', '),
        data: JSON.stringify({ cartId: cart.id, itemCount: cart.items.length }),
      })),
    });

    await prisma.notification.createMany({
      data: staleOrders.map(order => ({
        userId: order.seller.userId,
        type: 'SELLER_SLA_REMINDER',
        title: `Order ${order.orderNumber} needs attention`,
        body: 'Update the order status or generate a shipping label.',
        data: JSON.stringify({ orderId: order.id, status: order.status }),
      })),
    });

    const payoutSchedules = sellers.map(seller => ({
      sellerId: seller.id,
      nextRunAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      method: 'configured',
      estimatedBalance: seller.totalRevenue,
    }));

    const riskAssessments = await Promise.all(unpaidOrders.map(order => {
      const score = Math.min(100, 20 + (order.totalAmount > 1000000 ? 30 : 0) + (order.paymentMethod === 'CASH_ON_DELIVERY' ? 20 : 0));
      return prisma.riskAssessment.create({
        data: {
          entity: 'ORDER',
          entityId: order.id,
          score,
          level: score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW',
          reasons: JSON.stringify([
            'Payment has remained pending',
            ...(order.totalAmount > 1000000 ? ['High order value'] : []),
            ...(order.paymentMethod === 'CASH_ON_DELIVERY' ? ['Cash on delivery'] : []),
          ]),
        },
      });
    }));

    return {
      abandonedCartNotifications: carts.length,
      sellerSlaReminders: staleOrders.length,
      orderStatusNotifications: staleOrders.length,
      payoutSchedules,
      riskAssessments,
    };
  }
}
