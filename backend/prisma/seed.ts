import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.featureFlag.deleteMany();
  await prisma.adminRole.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // ── Admin Roles ──
  const superAdminRole = await prisma.adminRole.create({
    data: {
      name: 'SUPER_ADMIN',
      description: 'Full system access',
      permissions: JSON.stringify({
        users: ['Create', 'Read', 'Update', 'Delete'],
        products: ['Create', 'Read', 'Update', 'Delete', 'Approve'],
        categories: ['Create', 'Read', 'Update', 'Delete'],
        orders: ['Create', 'Read', 'Update', 'Delete'],
        sellers: ['Create', 'Read', 'Update', 'Delete', 'Approve'],
        reviews: ['Create', 'Read', 'Update', 'Delete'],
        config: ['Create', 'Read', 'Update', 'Delete'],
        roles: ['Create', 'Read', 'Update', 'Delete'],
      }),
      isSystem: true,
    },
  });

  await prisma.adminRole.create({
    data: {
      name: 'ADMIN',
      description: 'Standard admin access',
      permissions: JSON.stringify({
        users: ['Read', 'Update'],
        products: ['Read', 'Update', 'Approve'],
        categories: ['Create', 'Read', 'Update'],
        orders: ['Read', 'Update'],
        sellers: ['Read', 'Update', 'Approve'],
        reviews: ['Read', 'Update'],
      }),
      isSystem: true,
    },
  });

  await prisma.adminRole.create({
    data: {
      name: 'MODERATOR',
      description: 'Content moderation access',
      permissions: JSON.stringify({
        products: ['Read', 'Update'],
        reviews: ['Read', 'Update'],
        sellers: ['Read'],
      }),
      isSystem: true,
    },
  });

  // ── Admin User ──
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@marketplace.com',
      phone: '+255700000001',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isVerified: true,
      isActive: true,
    },
  });

  await prisma.adminUser.create({
    data: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  // ── Seller User ──
  const sellerPassword = await bcrypt.hash('Seller@123', 10);
  const sellerUser = await prisma.user.create({
    data: {
      email: 'seller@marketplace.com',
      phone: '+255700000002',
      passwordHash: sellerPassword,
      firstName: 'TechZone',
      lastName: 'Tanzania',
      role: 'SELLER',
      isVerified: true,
      isActive: true,
    },
  });

  // ── Customer User ──
  const customerPassword = await bcrypt.hash('Customer@123', 10);
  await prisma.user.create({
    data: {
      email: 'customer@marketplace.com',
      phone: '+255700000003',
      passwordHash: customerPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'CUSTOMER',
      isVerified: true,
      isActive: true,
    },
  });

  // ── Seller Profile ──
  const seller = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      storeName: 'TechZone Tanzania',
      storeSlug: 'techzone-tz',
      storeDescription: 'Your premier destination for electronics and gadgets in Tanzania. We offer the latest smartphones, laptops, and accessories at competitive prices.',
      storeLocation: 'Dar es Salaam',
      sellerType: 'BUSINESS',
      kycStatus: 'VERIFIED',
      isVerified: true,
      shippingPolicy: 'Free shipping on orders over 100,000 TZS. Delivery within 2-5 business days.',
      returnPolicy: '30-day return policy for unused items in original packaging.',
      warrantyPolicy: 'All products come with manufacturer warranty.',
      commissionRate: 0.05,
      rating: 4.5,
      totalOrders: 150,
      totalRevenue: 45000000,
    },
  });

  // ── Brands ──
  const samsung = await prisma.brand.create({ data: { name: 'Samsung', slug: 'samsung', description: 'Samsung Electronics', isApproved: true } });
  const apple = await prisma.brand.create({ data: { name: 'Apple', slug: 'apple', description: 'Apple Inc.', isApproved: true } });
  const nike = await prisma.brand.create({ data: { name: 'Nike', slug: 'nike', description: 'Nike Sportswear', isApproved: true } });
  const adidas = await prisma.brand.create({ data: { name: 'Adidas', slug: 'adidas', description: 'Adidas Sportswear', isApproved: true } });

  // ── Categories ──
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics', slug: 'electronics', description: 'Electronic devices and accessories', level: 0, sortOrder: 1,
      filters: JSON.stringify([
        { key: 'brand', label: 'Brand', type: 'select', required: false },
        { key: 'priceRange', label: 'Price Range', type: 'range', required: false },
        { key: 'rating', label: 'Rating', type: 'select', options: [{ label: '4+ Stars', value: '4' }, { label: '3+ Stars', value: '3' }] },
      ]),
      attributes: JSON.stringify([
        { name: 'color', label: 'Color', type: 'color', required: false },
        { name: 'warranty', label: 'Warranty', type: 'text', required: false },
      ]),
    },
  });

  const phones = await prisma.category.create({
    data: { name: 'Phones', slug: 'phones', description: 'Mobile phones and smartphones', parentId: electronics.id, level: 1, sortOrder: 1,
      filters: JSON.stringify([{ key: 'screenSize', label: 'Screen Size', type: 'select', options: [{ label: 'Under 5"', value: 'small' }, { label: '5-6"', value: 'medium' }, { label: '6"+', value: 'large' }] }]),
      attributes: JSON.stringify([{ name: 'ram', label: 'RAM', type: 'text', required: false }, { name: 'storage', label: 'Storage', type: 'text', required: false }]),
    },
  });

  await prisma.category.create({ data: { name: 'Smartphones', slug: 'smartphones', parentId: phones.id, level: 2, sortOrder: 1 } });
  await prisma.category.create({ data: { name: 'Phone Accessories', slug: 'phone-accessories', parentId: phones.id, level: 2, sortOrder: 2 } });

  const laptops = await prisma.category.create({
    data: { name: 'Laptops', slug: 'laptops', parentId: electronics.id, level: 1, sortOrder: 2,
      filters: JSON.stringify([{ key: 'ram', label: 'RAM', type: 'select', options: [{ label: '8GB', value: '8' }, { label: '16GB', value: '16' }, { label: '32GB', value: '32' }] }]),
      attributes: JSON.stringify([{ name: 'processor', label: 'Processor', type: 'text', required: true }, { name: 'storage', label: 'Storage', type: 'text', required: true }]),
    },
  });

  await prisma.category.create({ data: { name: 'Gaming Laptops', slug: 'gaming-laptops', parentId: laptops.id, level: 2, sortOrder: 1 } });
  await prisma.category.create({ data: { name: 'Ultrabooks', slug: 'ultrabooks', parentId: laptops.id, level: 2, sortOrder: 2 } });

  const fashion = await prisma.category.create({
    data: { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes and accessories', level: 0, sortOrder: 2,
      filters: JSON.stringify([{ key: 'size', label: 'Size', type: 'select', options: [{ label: 'S', value: 'S' }, { label: 'M', value: 'M' }, { label: 'L', value: 'L' }, { label: 'XL', value: 'XL' }] }]),
      attributes: JSON.stringify([{ name: 'material', label: 'Material', type: 'text', required: false }, { name: 'color', label: 'Color', type: 'color', required: true }]),
    },
  });

  const menFashion = await prisma.category.create({ data: { name: "Men's Fashion", slug: 'men-fashion', parentId: fashion.id, level: 1, sortOrder: 1 } });
  await prisma.category.create({ data: { name: "Men's Shirts", slug: 'men-shirts', parentId: menFashion.id, level: 2, sortOrder: 1 } });
  await prisma.category.create({ data: { name: "Men's Shoes", slug: 'men-shoes', parentId: menFashion.id, level: 2, sortOrder: 2 } });

  const womenFashion = await prisma.category.create({ data: { name: "Women's Fashion", slug: 'women-fashion', parentId: fashion.id, level: 1, sortOrder: 2 } });
  await prisma.category.create({ data: { name: "Women's Dresses", slug: 'women-dresses', parentId: womenFashion.id, level: 2, sortOrder: 1 } });
  await prisma.category.create({ data: { name: "Women's Shoes", slug: 'women-shoes', parentId: womenFashion.id, level: 2, sortOrder: 2 } });

  await prisma.category.create({ data: { name: 'Home & Living', slug: 'home-living', description: 'Home decor, furniture and kitchen', level: 0, sortOrder: 3 } });
  await prisma.category.create({ data: { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports equipment and outdoor gear', level: 0, sortOrder: 4 } });

  // ── Products ──
  const product1 = await prisma.product.create({
    data: {
      sellerId: seller.id, categoryId: phones.id, brandId: samsung.id,
      title: 'Samsung Galaxy S24 Ultra 5G', slug: 'samsung-galaxy-s24-ultra',
      description: 'The ultimate Galaxy experience with AI-powered features. 200MP camera, S Pen included, and all-day battery life. Features a stunning 6.8" Dynamic AMOLED 2X display with 120Hz refresh rate.',
      basePrice: 2500000, discountPrice: 2200000,
      specifications: JSON.stringify({ 'Display': '6.8" Dynamic AMOLED 2X', 'Processor': 'Snapdragon 8 Gen 3', 'RAM': '12GB', 'Storage': '256GB', 'Battery': '5000mAh', 'Camera': '200MP + 50MP + 12MP + 10MP' }),
      status: 'ACTIVE', isFeatured: true, rating: 4.8, reviewCount: 45, totalSales: 120,
      images: { create: [{ url: '/uploads/products/s24-ultra-1.jpg', alt: 'Samsung Galaxy S24 Ultra', isPrimary: true, sortOrder: 0 }] },
      variants: {
        create: [
          { sku: 'S24U-BLK-256', price: 2200000, stock: 15, attributes: JSON.stringify({ color: 'Titanium Black', storage: '256GB' }) },
          { sku: 'S24U-GRY-256', price: 2200000, stock: 10, attributes: JSON.stringify({ color: 'Titanium Gray', storage: '256GB' }) },
          { sku: 'S24U-BLK-512', price: 2500000, stock: 8, attributes: JSON.stringify({ color: 'Titanium Black', storage: '512GB' }) },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      sellerId: seller.id, categoryId: phones.id, brandId: apple.id,
      title: 'iPhone 15 Pro Max 256GB', slug: 'iphone-15-pro-max',
      description: 'The most powerful iPhone ever. A17 Pro chip, 48MP camera system with 5x optical zoom, titanium design, and all-day battery life.',
      basePrice: 2800000, discountPrice: 2600000,
      specifications: JSON.stringify({ 'Display': '6.7" Super Retina XDR', 'Chip': 'A17 Pro', 'Storage': '256GB', 'Camera': '48MP + 12MP + 12MP', 'Battery': '29 hours video playback' }),
      status: 'ACTIVE', isFeatured: true, rating: 4.9, reviewCount: 78, totalSales: 200,
      images: { create: [{ url: '/uploads/products/iphone15pm-1.jpg', alt: 'iPhone 15 Pro Max', isPrimary: true, sortOrder: 0 }] },
      variants: {
        create: [
          { sku: 'IP15PM-NTL-256', price: 2600000, stock: 12, attributes: JSON.stringify({ color: 'Natural Titanium', storage: '256GB' }) },
          { sku: 'IP15PM-BLK-256', price: 2600000, stock: 8, attributes: JSON.stringify({ color: 'Black Titanium', storage: '256GB' }) },
          { sku: 'IP15PM-NTL-512', price: 3000000, stock: 5, attributes: JSON.stringify({ color: 'Natural Titanium', storage: '512GB' }) },
        ],
      },
    },
  });

  const product3 = await prisma.product.create({
    data: {
      sellerId: seller.id, categoryId: laptops.id, brandId: apple.id,
      title: 'MacBook Pro 14" M3 Pro', slug: 'macbook-pro-14-m3',
      description: 'Supercharged by M3 Pro chip. 14-inch Liquid Retina XDR display, up to 18GB unified memory, and extraordinary battery life. Perfect for professionals.',
      basePrice: 3500000,
      specifications: JSON.stringify({ 'Display': '14.2" Liquid Retina XDR', 'Chip': 'M3 Pro', 'RAM': '18GB', 'Storage': '512GB SSD', 'Battery': 'Up to 17 hours' }),
      status: 'ACTIVE', isFeatured: true, rating: 4.7, reviewCount: 34, totalSales: 89,
      images: { create: [{ url: '/uploads/products/mbp14-1.jpg', alt: 'MacBook Pro 14"', isPrimary: true, sortOrder: 0 }] },
      variants: {
        create: [
          { sku: 'MBP14-M3P-18-512', price: 3500000, stock: 7, attributes: JSON.stringify({ chip: 'M3 Pro', ram: '18GB', storage: '512GB' }) },
          { sku: 'MBP14-M3P-36-1T', price: 4200000, stock: 3, attributes: JSON.stringify({ chip: 'M3 Pro', ram: '36GB', storage: '1TB' }) },
        ],
      },
    },
  });

  const product4 = await prisma.product.create({
    data: {
      sellerId: seller.id, categoryId: menFashion.id, brandId: nike.id,
      title: 'Nike Air Max 90 Essential', slug: 'nike-air-max-90',
      description: 'Timeless style meets modern comfort. The Nike Air Max 90 features a classic design with visible Air cushioning for all-day comfort.',
      basePrice: 180000,
      specifications: JSON.stringify({ 'Upper': 'Leather and mesh', 'Sole': 'Rubber', 'Closure': 'Lace-up', 'Cushioning': 'Visible Air Max' }),
      status: 'ACTIVE', isFeatured: true, rating: 4.5, reviewCount: 120, totalSales: 340,
      images: { create: [{ url: '/uploads/products/airmax90-1.jpg', alt: 'Nike Air Max 90', isPrimary: true, sortOrder: 0 }] },
      variants: {
        create: [
          { sku: 'AM90-WHT-42', price: 185000, discountPrice: 165000, stock: 25, attributes: JSON.stringify({ color: 'White/Red', size: '42' }) },
          { sku: 'AM90-BLK-42', price: 185000, discountPrice: 165000, stock: 20, attributes: JSON.stringify({ color: 'Black/White', size: '42' }) },
          { sku: 'AM90-WHT-44', price: 185000, discountPrice: 165000, stock: 15, attributes: JSON.stringify({ color: 'White/Red', size: '44' }) },
          { sku: 'AM90-BLK-44', price: 185000, discountPrice: 165000, stock: 18, attributes: JSON.stringify({ color: 'Black/White', size: '44' }) },
        ],
      },
    },
  });

  const product5 = await prisma.product.create({
    data: {
      sellerId: seller.id, categoryId: menFashion.id, brandId: adidas.id,
      title: 'Adidas Ultraboost Light', slug: 'adidas-ultraboost-light',
      description: 'Our lightest Ultraboost ever. Made with at least 25% recycled materials, featuring adidas PRIMEKNIT+ upper and Light BOOST midsole.',
      basePrice: 250000,
      specifications: JSON.stringify({ 'Upper': 'PRIMEKNIT+', 'Sole': 'Continental Rubber', 'Midsole': 'Light BOOST', 'Weight': '310g' }),
      status: 'ACTIVE', isFeatured: true, rating: 4.6, reviewCount: 89, totalSales: 210,
      images: { create: [{ url: '/uploads/products/ultraboost-1.jpg', alt: 'Adidas Ultraboost Light', isPrimary: true, sortOrder: 0 }] },
      variants: {
        create: [
          { sku: 'UBL-CRW-42', price: 250000, stock: 20, attributes: JSON.stringify({ color: 'Core Black/White', size: '42' }) },
          { sku: 'UBL-CRW-44', price: 250000, stock: 15, attributes: JSON.stringify({ color: 'Core Black/White', size: '44' }) },
        ],
      },
    },
  });

  // ── Reviews ──
  await prisma.review.create({
    data: {
      userId: (await prisma.user.findFirst({ where: { email: 'customer@marketplace.com' } }))!.id,
      productId: product2.id, rating: 5, title: 'Amazing phone!', text: 'Best iPhone I have ever used. The camera is incredible and battery lasts all day.',
      isVerified: true, isApproved: true,
    },
  });

  await prisma.review.create({
    data: {
      userId: (await prisma.user.findFirst({ where: { email: 'customer@marketplace.com' } }))!.id,
      productId: product4.id, rating: 4, title: 'Classic sneakers', text: 'Comfortable and stylish. True to size.',
      isVerified: true, isApproved: true,
    },
  });

  // ── Feature Flags ──
  const defaultFlags = [
    { key: 'site.name', value: JSON.stringify('MarketPlace'), type: 'string', description: 'Site name displayed across the platform', isActive: true },
    { key: 'site.description', value: JSON.stringify('Your trusted marketplace for buying and selling quality products'), type: 'string', description: 'Site meta description', isActive: true },
    { key: 'site.currency', value: JSON.stringify('TZS'), type: 'string', description: 'Default currency for the platform', isActive: true },
    { key: 'currency.symbol', value: JSON.stringify('TZS'), type: 'string', description: 'Currency symbol display', isActive: true },
    { key: 'tax.rate', value: JSON.stringify(0.18), type: 'number', description: 'Default VAT/tax rate (18%)', isActive: true },
    { key: 'shipping.free_threshold', value: JSON.stringify(50000), type: 'number', description: 'Free shipping for orders above this amount (TZS)', isActive: true },
    { key: 'shipping.base_rate', value: JSON.stringify(5000), type: 'number', description: 'Base shipping rate (TZS)', isActive: true },
    { key: 'seller.commission_rate', value: JSON.stringify(0.05), type: 'number', description: 'Default seller commission rate (5%)', isActive: true },
    { key: 'order.cancellation_window', value: JSON.stringify(24), type: 'number', description: 'Hours after which order cannot be cancelled', isActive: true },
    { key: 'review.auto_approve', value: JSON.stringify(true), type: 'boolean', description: 'Auto-approve reviews from verified purchases', isActive: true },
    { key: 'auth.otp_enabled', value: JSON.stringify(false), type: 'boolean', description: 'Enable OTP verification for login', isActive: true },
    { key: 'feature.new_arrivals', value: JSON.stringify(true), type: 'boolean', description: 'Show new arrivals section on homepage', isActive: true },
    { key: 'feature.flash_sales', value: JSON.stringify(true), type: 'boolean', description: 'Enable flash sales feature', isActive: true },
    { key: 'feature.wishlist', value: JSON.stringify(true), type: 'boolean', description: 'Enable wishlist feature', isActive: true },
    { key: 'site.maintenance_mode', value: JSON.stringify(false), type: 'boolean', description: 'Put site in maintenance mode', isActive: true },
    { key: 'seo.default_title', value: JSON.stringify('MarketPlace - Buy and Sell Online'), type: 'string', description: 'Default SEO title', isActive: true },
    { key: 'seo.default_description', value: JSON.stringify('MarketPlace is your trusted online marketplace for buying and selling quality products.'), type: 'string', description: 'Default SEO description', isActive: true },
    { key: 'homepage.hero_title', value: JSON.stringify('Discover Amazing Products'), type: 'string', description: 'Homepage hero section title', isActive: true },
    { key: 'homepage.hero_subtitle', value: JSON.stringify('Shop from thousands of products at unbeatable prices.'), type: 'string', description: 'Homepage hero section subtitle', isActive: true },
    { key: 'theme.primary_color', value: JSON.stringify('#2563eb'), type: 'string', description: 'Primary theme color', isActive: true },
    { key: 'theme.secondary_color', value: JSON.stringify('#6b7280'), type: 'string', description: 'Secondary theme color', isActive: true },
    { key: 'contact.email', value: JSON.stringify('support@marketplace.co.tz'), type: 'string', description: 'Support email address', isActive: true },
    { key: 'contact.phone', value: JSON.stringify('+255 123 456 789'), type: 'string', description: 'Support phone number', isActive: true },
    { key: 'contact.address', value: JSON.stringify('Dar es Salaam, Tanzania'), type: 'string', description: 'Business address', isActive: true },
  ];

  for (const flag of defaultFlags) {
    await prisma.featureFlag.create({ data: flag });
  }

  console.log('✅ Seed completed successfully!');
  console.log('📧 Admin: admin@marketplace.com / Admin@123');
  console.log('📧 Seller: seller@marketplace.com / Seller@123');
  console.log('📧 Customer: customer@marketplace.com / Customer@123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });