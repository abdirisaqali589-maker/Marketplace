import { prisma } from '../../common/prisma';
import { NotFoundError } from '../../common/errors';

export class ShippingService {
  async create(data: any) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) throw new NotFoundError('Order not found');

    const shipment = await prisma.shipment.create({
      data: {
        orderId: data.orderId,
        courierCode: data.courierCode,
        trackingNumber: data.trackingNumber,
        status: 'PENDING',
        origin: data.origin,
        destination: data.destination,
        weight: data.weight,
        estimatedDays: data.estimatedDays,
      },
    });

    await prisma.order.update({
      where: { id: data.orderId },
      data: { status: 'SHIPPED', trackingNumber: data.trackingNumber, courierCode: data.courierCode },
    });

    return shipment;
  }

  async findByOrder(orderId: string) {
    return prisma.shipment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundError('Shipment not found');
    return shipment;
  }

  async update(id: string, data: any) {
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundError('Shipment not found');

    const updateData: any = {};
    if (data.courierCode) updateData.courierCode = data.courierCode;
    if (data.trackingNumber) updateData.trackingNumber = data.trackingNumber;
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'DELIVERED') updateData.deliveredAt = new Date();
      if (data.status === 'SHIPPED') updateData.shippedAt = new Date();
    }
    if (data.estimatedDays) updateData.estimatedDays = data.estimatedDays;
    if (data.events) updateData.events = JSON.stringify(data.events);

    const updated = await prisma.shipment.update({ where: { id }, data: updateData });

    if (data.status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });
    }

    return updated;
  }

  async appendEvent(id: string, data: any) {
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundError('Shipment not found');

    const events = shipment.events ? JSON.parse(shipment.events) : [];
    events.push({
      status: data.status,
      location: data.location,
      description: data.description,
      timestamp: new Date().toISOString(),
    });

    const updateData: any = { events: JSON.stringify(events), status: data.status };
    if (data.status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (data.status === 'SHIPPED' || data.status === 'IN_TRANSIT') updateData.shippedAt = shipment.shippedAt || new Date();

    const updated = await prisma.shipment.update({ where: { id }, data: updateData });
    if (data.status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });
    }
    return { ...updated, events };
  }

  async trackByTrackingNumber(trackingNumber: string) {
    const shipment = await prisma.shipment.findFirst({ where: { trackingNumber } });
    if (!shipment) throw new NotFoundError('Shipment not found');
    return { ...shipment, events: shipment.events ? JSON.parse(shipment.events) : [] };
  }

  async generateLabel(orderId: string, data: any) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');

    const courierCode = data.provider || order.courierCode || 'local';
    const trackingNumber = order.trackingNumber || `${courierCode.toUpperCase()}-${Date.now()}`;
    const labelUrl = `/api/shipping/labels/${trackingNumber}`;
    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        courierCode,
        trackingNumber,
        status: 'PENDING',
        origin: 'Seller warehouse',
        destination: order.shippingAddress,
        weight: data.package?.weight,
        dimensions: data.package ? JSON.stringify(data.package) : null,
        labelUrl,
        estimatedDays: courierCode === 'local' ? 2 : 5,
      },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { courierCode, trackingNumber, status: 'READY_TO_SHIP' },
    });
    return {
      ...shipment,
      labelUrl,
      providerPayload: {
        provider: courierCode,
        trackingNumber,
        serviceLevel: data.serviceLevel || 'standard',
        simulated: courierCode === 'local',
      },
    };
  }
}
