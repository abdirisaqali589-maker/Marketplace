import { prisma } from './prisma';

// Simple HTML invoice generation (PDF-ready via puppeteer/wkhtmltopdf)
export async function generateInvoiceHTML(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { title: true, slug: true } },
          variant: { select: { sku: true, attributes: true } },
        },
      },
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      seller: { select: { storeName: true, storeSlug: true } },
      payments: { select: { method: true, status: true, paidAt: true, transactionId: true, amount: true } },
    },
  });

  if (!order) throw new Error('Order not found');

  const shippingInfo = order.shippingAddress ? JSON.parse(order.shippingAddress) : null;
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const itemsHtml = order.items.map((item, idx) => {
    const attrs = item.variant?.attributes ? JSON.parse(item.variant.attributes) : {};
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(', ');
    return `
      <tr${idx % 2 === 0 ? ' style="background: #f9fafb;"' : ''}>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${item.product.title}${attrStr ? `<br><small style="color: #6b7280;">${attrStr}</small>` : ''}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">TZS ${item.unitPrice.toLocaleString()}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">TZS ${item.totalPrice.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${order.orderNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1f2937; }
        .invoice-box { max-width: 800px; margin: 0 auto; padding: 40px; border: 1px solid #e5e7eb; border-radius: 12px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #ea580c; }
        .logo { font-size: 28px; font-weight: 700; color: #ea580c; }
        .invoice-title { font-size: 24px; font-weight: 700; color: #374151; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #d1fae5; color: #065f46; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
        td { padding: 12px; }
        .totals { text-align: right; margin-top: 16px; padding-top: 16px; border-top: 2px solid #e5e7eb; }
        .totals div { margin: 4px 0; font-size: 15px; }
        .totals .grand-total { font-size: 20px; font-weight: 700; color: #ea580c; margin-top: 8px; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
        .address { margin: 16px 0; }
        .address strong { display: block; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <div class="logo">MarketPlace</div>
          <div>
            <div class="invoice-title">Invoice</div>
            <div style="color: #6b7280; font-size: 14px;">#${order.orderNumber}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
          <div class="address">
            <strong>Bill To</strong>
            ${order.user.firstName || ''} ${order.user.lastName || ''}<br>
            ${order.user.email || ''}<br>
            ${order.user.phone || ''}<br>
            ${shippingInfo ? `${shippingInfo.street || ''}<br>${shippingInfo.city || ''}, ${shippingInfo.state || ''} ${shippingInfo.zipCode || ''}` : ''}
          </div>
          <div class="address" style="text-align: right;">
            <strong>Seller</strong>
            ${order.seller.storeName}<br>
            <strong>Order Date</strong><br>
            ${orderDate}<br>
            <strong>Payment</strong><br>
            ${order.payments[0]?.method || 'N/A'} <span class="status-badge">${order.paymentStatus}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div>Subtotal: TZS ${order.subtotal.toLocaleString()}</div>
          ${order.shippingFee > 0 ? `<div>Shipping: TZS ${order.shippingFee.toLocaleString()}</div>` : ''}
          ${order.taxAmount > 0 ? `<div>Tax: TZS ${order.taxAmount.toLocaleString()}</div>` : ''}
          ${order.discountAmount > 0 ? `<div>Discount: -TZS ${order.discountAmount.toLocaleString()}</div>` : ''}
          <div class="grand-total">Total: TZS ${order.totalAmount.toLocaleString()}</div>
        </div>

        <div class="footer">
          <p>MarketPlace - Your Trusted Online Marketplace</p>
          <p>Thank you for your business!</p>
          ${order.trackingNumber ? `<p>Tracking: ${order.trackingNumber} (${order.courierCode || 'N/A'})</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}