/**
 * Bulk Seed Script for All Databases
 * Generates 100k+ records for performance testing
 *
 * Usage:
 *   npx tsx scripts/seed-all-databases.ts [database] [--records=N]
 *
 * Examples:
 *   npx tsx scripts/seed-all-databases.ts              # All databases, 100k orders
 *   npx tsx scripts/seed-all-databases.ts postgres     # Only PostgreSQL
 *   npx tsx scripts/seed-all-databases.ts mysql        # Only MySQL
 *   npx tsx scripts/seed-all-databases.ts sqlserver    # Only SQL Server
 *   npx tsx scripts/seed-all-databases.ts mongodb      # Only MongoDB
 *   npx tsx scripts/seed-all-databases.ts --records=500000  # 500k orders
 */

import { faker } from '@faker-js/faker';
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import sql from 'mssql';
import { MongoClient, Db } from 'mongodb';

// Configuration
const CONFIG = {
  // Number of records to generate
  CATEGORIES: 50,
  PRODUCTS: 5000,
  CUSTOMERS: 50000,
  ORDERS: 100000, // Can be overridden via --records flag
  REVIEWS_PER_PRODUCT: 20,

  // Batch sizes for inserts (PostgreSQL max ~65535 params per query)
  BATCH_SIZE: {
    POSTGRES: 1000, // Reduced to stay under param limit for complex inserts
    MYSQL: 2000,
    SQLSERVER: 1000,
    MONGODB: 10000,
  },

  // Connection strings
  POSTGRES: {
    host: 'localhost',
    port: 5433,
    database: 'ecommerce_demo',
    user: 'ecommerce',
    password: 'ecommerce123',
  },
  MYSQL: {
    host: 'localhost',
    port: 3306,
    database: 'ecommerce_demo',
    user: 'ecommerce',
    password: 'ecommerce123',
  },
  SQLSERVER: {
    server: 'localhost',
    port: 1433,
    database: 'master', // Connect to master first, then create/use ecommerce_demo
    user: 'sa',
    password: 'EcommercePass123!',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
  MONGODB: {
    url: 'mongodb://ecommerce:ecommerce123@localhost:27017/ecommerce_demo?authSource=ecommerce_demo',
    database: 'ecommerce_demo',
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const targetDb = args.find((a) => !a.startsWith('--'))?.toLowerCase();
const recordsArg = args.find((a) => a.startsWith('--records='));
if (recordsArg) {
  CONFIG.ORDERS = parseInt(recordsArg.split('=')[1], 10);
}

console.log(`
╔════════════════════════════════════════════════════════════╗
║           BULK SEED SCRIPT - ECOMMERCE DEMO                ║
╠════════════════════════════════════════════════════════════╣
║  Categories:  ${String(CONFIG.CATEGORIES).padStart(8)}                              ║
║  Products:    ${String(CONFIG.PRODUCTS).padStart(8)}                              ║
║  Customers:   ${String(CONFIG.CUSTOMERS).padStart(8)}                              ║
║  Orders:      ${String(CONFIG.ORDERS).padStart(8)}                              ║
║  Reviews:     ${String(CONFIG.PRODUCTS * CONFIG.REVIEWS_PER_PRODUCT).padStart(8)}                              ║
╚════════════════════════════════════════════════════════════╝
`);

// ============================================================
// DATA GENERATORS
// ============================================================

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  cost: number;
  stock_quantity: number;
  category_id: number;
  is_active: boolean;
  weight: number;
}

interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: Date;
}

interface Address {
  id: number;
  customer_id: number;
  address_type: 'billing' | 'shipping';
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  shipping_address_id: number;
  billing_address_id: number;
  created_at: Date;
}

interface OrderItem {
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Review {
  product_id: number;
  customer_id: number;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
}

const CATEGORY_NAMES = [
  'Electronics', 'Computers', 'Smartphones', 'Tablets', 'Laptops',
  'Clothing', 'Men\'s Fashion', 'Women\'s Fashion', 'Kids\' Clothing', 'Shoes',
  'Home & Garden', 'Furniture', 'Kitchen', 'Bedding', 'Decor',
  'Sports', 'Fitness', 'Outdoor', 'Team Sports', 'Water Sports',
  'Books', 'Fiction', 'Non-Fiction', 'Textbooks', 'Comics',
  'Toys & Games', 'Board Games', 'Video Games', 'Puzzles', 'Action Figures',
  'Health & Beauty', 'Skincare', 'Makeup', 'Hair Care', 'Vitamins',
  'Automotive', 'Car Parts', 'Tools', 'Accessories', 'Maintenance',
  'Food & Grocery', 'Snacks', 'Beverages', 'Organic', 'International',
  'Pet Supplies', 'Dog', 'Cat', 'Fish', 'Bird',
];

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateCategories(): Category[] {
  const categories: Category[] = [];
  const mainCategories = CATEGORY_NAMES.slice(0, 10);
  const usedSlugs = new Set<string>();

  // Main categories (no parent)
  mainCategories.forEach((name, i) => {
    let slug = slugify(name);
    let counter = 1;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(name)}-${counter++}`;
    }
    usedSlugs.add(slug);

    categories.push({
      id: i + 1,
      name,
      slug,
      description: faker.commerce.productDescription(),
      parent_id: null,
    });
  });

  // Sub-categories
  for (let i = 10; i < CONFIG.CATEGORIES; i++) {
    const parentId = Math.floor(Math.random() * 10) + 1;
    const name = CATEGORY_NAMES[i] || faker.commerce.department();
    let slug = slugify(name);
    let counter = 1;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(name)}-${counter++}`;
    }
    usedSlugs.add(slug);

    categories.push({
      id: i + 1,
      name,
      slug,
      description: faker.commerce.productDescription(),
      parent_id: parentId,
    });
  }

  return categories;
}

function generateProducts(categoryCount: number): Product[] {
  const products: Product[] = [];
  const usedSkus = new Set<string>();
  const usedSlugs = new Set<string>();

  for (let i = 0; i < CONFIG.PRODUCTS; i++) {
    let sku: string;
    do {
      sku = `SKU-${faker.string.alphanumeric(8).toUpperCase()}`;
    } while (usedSkus.has(sku));
    usedSkus.add(sku);

    const name = faker.commerce.productName();
    let slug = slugify(name);
    let counter = 1;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(name)}-${counter++}`;
    }
    usedSlugs.add(slug);

    const price = parseFloat(faker.commerce.price({ min: 5, max: 2000 }));
    products.push({
      id: i + 1,
      sku,
      name,
      slug,
      description: faker.commerce.productDescription(),
      price,
      cost: price * (0.4 + Math.random() * 0.3), // 40-70% of price
      stock_quantity: faker.number.int({ min: 0, max: 1000 }),
      category_id: faker.number.int({ min: 1, max: categoryCount }),
      is_active: Math.random() > 0.1, // 90% active
      weight: parseFloat((Math.random() * 50).toFixed(2)),
    });

    if ((i + 1) % 1000 === 0) {
      process.stdout.write(`\r  Generating products: ${i + 1}/${CONFIG.PRODUCTS}`);
    }
  }
  console.log();
  return products;
}

function generateCustomers(): Customer[] {
  const customers: Customer[] = [];
  const usedEmails = new Set<string>();

  for (let i = 0; i < CONFIG.CUSTOMERS; i++) {
    let email: string;
    do {
      email = faker.internet.email().toLowerCase();
    } while (usedEmails.has(email));
    usedEmails.add(email);

    customers.push({
      id: i + 1,
      email,
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      phone: faker.phone.number().substring(0, 20), // Truncate to 20 chars for MySQL
      date_of_birth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
    });

    if ((i + 1) % 10000 === 0) {
      process.stdout.write(`\r  Generating customers: ${i + 1}/${CONFIG.CUSTOMERS}`);
    }
  }
  console.log();
  return customers;
}

function generateAddresses(customerCount: number): Address[] {
  const addresses: Address[] = [];
  let addressId = 1;

  for (let customerId = 1; customerId <= customerCount; customerId++) {
    // Each customer has 1-3 addresses
    const numAddresses = faker.number.int({ min: 1, max: 3 });

    for (let j = 0; j < numAddresses; j++) {
      addresses.push({
        id: addressId++,
        customer_id: customerId,
        address_type: j === 0 ? 'shipping' : (Math.random() > 0.5 ? 'billing' : 'shipping'),
        street_address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        postal_code: faker.location.zipCode(),
        country: 'USA',
        is_default: j === 0,
      });
    }

    if (customerId % 10000 === 0) {
      process.stdout.write(`\r  Generating addresses: ${addressId - 1} (customer ${customerId}/${customerCount})`);
    }
  }
  console.log();
  return addresses;
}

function generateOrdersAndItems(
  customerCount: number,
  productCount: number,
  addressCount: number,
  products: Product[]
): { orders: Order[]; orderItems: OrderItem[] } {
  const orders: Order[] = [];
  const orderItems: OrderItem[] = [];
  const usedOrderNumbers = new Set<string>();

  // Pre-calculate customer address ranges for faster lookup
  const customerAddressMap = new Map<number, number[]>();
  let addrId = 1;
  for (let c = 1; c <= customerCount; c++) {
    const numAddr = faker.number.int({ min: 1, max: 3 });
    const addrs: number[] = [];
    for (let a = 0; a < numAddr; a++) {
      addrs.push(addrId++);
    }
    customerAddressMap.set(c, addrs);
  }

  for (let i = 0; i < CONFIG.ORDERS; i++) {
    let orderNumber: string;
    do {
      orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${faker.string.alphanumeric(6).toUpperCase()}`;
    } while (usedOrderNumbers.has(orderNumber));
    usedOrderNumbers.add(orderNumber);

    const customerId = faker.number.int({ min: 1, max: customerCount });
    const customerAddresses = customerAddressMap.get(customerId) || [1];
    const addressId = customerAddresses[Math.floor(Math.random() * customerAddresses.length)];

    // Generate 1-5 items per order
    const numItems = faker.number.int({ min: 1, max: 5 });
    let subtotal = 0;
    const usedProducts = new Set<number>();

    for (let j = 0; j < numItems; j++) {
      let productId: number;
      do {
        productId = faker.number.int({ min: 1, max: productCount });
      } while (usedProducts.has(productId));
      usedProducts.add(productId);

      const product = products[productId - 1];
      const quantity = faker.number.int({ min: 1, max: 5 });
      const unitPrice = product.price;
      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;

      orderItems.push({
        order_id: i + 1,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    const taxAmount = subtotal * 0.08; // 8% tax
    const shippingAmount = subtotal > 100 ? 0 : 9.99;
    const discountAmount = Math.random() > 0.8 ? subtotal * 0.1 : 0; // 20% chance of 10% discount
    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

    // Random date in the last 2 years
    const createdAt = faker.date.between({
      from: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
      to: new Date(),
    });

    orders.push({
      id: i + 1,
      order_number: orderNumber,
      customer_id: customerId,
      status: ORDER_STATUSES[Math.floor(Math.random() * ORDER_STATUSES.length)],
      subtotal,
      tax_amount: taxAmount,
      shipping_amount: shippingAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      shipping_address_id: addressId,
      billing_address_id: addressId,
      created_at: createdAt,
    });

    if ((i + 1) % 10000 === 0) {
      process.stdout.write(`\r  Generating orders: ${i + 1}/${CONFIG.ORDERS} (${orderItems.length} items)`);
    }
  }
  console.log();
  return { orders, orderItems };
}

function generateReviews(productCount: number, customerCount: number): Review[] {
  const reviews: Review[] = [];
  const reviewsPerProduct = CONFIG.REVIEWS_PER_PRODUCT;

  for (let productId = 1; productId <= productCount; productId++) {
    const numReviews = faker.number.int({ min: 0, max: reviewsPerProduct });
    const usedCustomers = new Set<number>();

    for (let j = 0; j < numReviews; j++) {
      let customerId: number;
      do {
        customerId = faker.number.int({ min: 1, max: customerCount });
      } while (usedCustomers.has(customerId));
      usedCustomers.add(customerId);

      // Weighted rating distribution (more 4s and 5s)
      const ratingWeights = [0.05, 0.1, 0.15, 0.3, 0.4]; // 1-5 stars
      const rand = Math.random();
      let rating = 5;
      let cumulative = 0;
      for (let r = 0; r < ratingWeights.length; r++) {
        cumulative += ratingWeights[r];
        if (rand < cumulative) {
          rating = r + 1;
          break;
        }
      }

      reviews.push({
        product_id: productId,
        customer_id: customerId,
        rating,
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        comment: faker.lorem.paragraph({ min: 1, max: 3 }),
        is_verified_purchase: Math.random() > 0.3, // 70% verified
      });
    }

    if (productId % 500 === 0) {
      process.stdout.write(`\r  Generating reviews: product ${productId}/${productCount}`);
    }
  }
  console.log();
  return reviews;
}

// ============================================================
// DATABASE SEEDERS
// ============================================================

// Brazilian states (UF codes)
const BRAZILIAN_STATES = ['SP', 'RJ', 'MG', 'RS', 'PR', 'BA', 'SC', 'PE', 'CE', 'GO', 'PA', 'MA', 'ES', 'PB', 'RN', 'MT', 'AL', 'PI', 'DF', 'MS'];
const BRAZILIAN_CITIES = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Curitiba', 'Salvador', 'Florianópolis', 'Recife', 'Fortaleza', 'Goiânia'];
const NEIGHBORHOODS = ['Centro', 'Jardins', 'Vila Madalena', 'Copacabana', 'Ipanema', 'Leblon', 'Pinheiros', 'Moema', 'Consolação', 'Brooklin'];
const PAYMENT_METHODS = ['pix', 'credit_card', 'boleto', 'debit_card'];
const SHIPPING_METHODS = ['PAC', 'SEDEX', 'Transportadora', 'Retirada'];
const ORDER_STATUSES_PG = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
const FULFILLMENT_STATUSES = ['unfulfilled', 'partially_fulfilled', 'fulfilled'];

function generateCPF(): string {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

function generateCEP(): string {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}${n()}${n()}${n()}-${n()}${n()}${n()}`;
}

async function seedPostgres(
  categories: Category[],
  products: Product[],
  customers: Customer[],
  addresses: Address[],
  orders: Order[],
  orderItems: OrderItem[],
  reviews: Review[]
) {
  console.log('\n📦 Seeding PostgreSQL (Brazilian E-commerce Schema)...');
  const pool = new Pool(CONFIG.POSTGRES);

  try {
    // Clear existing data
    console.log('  Clearing existing data...');
    await pool.query('TRUNCATE categories, products, customers, addresses, orders, order_items, reviews, inventory_movements RESTART IDENTITY CASCADE');

    // Categories
    console.log('  Inserting categories...');
    for (const cat of categories) {
      await pool.query(
        'INSERT INTO categories (id, name, slug, description, parent_id) VALUES ($1, $2, $3, $4, $5)',
        [cat.id, cat.name, cat.slug, cat.description, cat.parent_id]
      );
    }
    await pool.query(`SELECT setval('categories_id_seq', $1)`, [categories.length]);

    // Products (batch)
    console.log('  Inserting products...');
    for (let i = 0; i < products.length; i += CONFIG.BATCH_SIZE.POSTGRES) {
      const batch = products.slice(i, i + CONFIG.BATCH_SIZE.POSTGRES);
      const values: any[] = [];
      const placeholderRows: string[] = [];
      for (let idx = 0; idx < batch.length; idx++) {
        const p = batch[idx];
        const offset = idx * 11;
        values.push(p.id, p.sku, p.name, p.slug, p.description, p.price, p.cost, p.stock_quantity, p.category_id, p.is_active, p.weight);
        placeholderRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`);
      }
      if (values.length > 0) {
        await pool.query(
          `INSERT INTO products (id, sku, name, slug, description, price, cost_price, stock_quantity, category_id, is_active, weight_kg) VALUES ${placeholderRows.join(',')}`,
          values
        );
      }
      process.stdout.write(`\r  Products: ${Math.min(i + CONFIG.BATCH_SIZE.POSTGRES, products.length)}/${products.length}`);
    }
    await pool.query(`SELECT setval('products_id_seq', $1)`, [products.length]);
    console.log();

    // Customers (batch) - PostgreSQL schema uses birth_date and cpf
    console.log('  Inserting customers...');
    for (let i = 0; i < customers.length; i += CONFIG.BATCH_SIZE.POSTGRES) {
      const batch = customers.slice(i, i + CONFIG.BATCH_SIZE.POSTGRES);
      const values: any[] = [];
      const placeholderRows: string[] = [];
      for (let idx = 0; idx < batch.length; idx++) {
        const c = batch[idx];
        const offset = idx * 7;
        const cpf = generateCPF();
        values.push(c.id, c.email, cpf, c.first_name, c.last_name, c.phone, c.date_of_birth);
        placeholderRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
      }
      if (values.length > 0) {
        await pool.query(
          `INSERT INTO customers (id, email, cpf, first_name, last_name, phone, birth_date) VALUES ${placeholderRows.join(',')}`,
          values
        );
      }
      process.stdout.write(`\r  Customers: ${Math.min(i + CONFIG.BATCH_SIZE.POSTGRES, customers.length)}/${customers.length}`);
    }
    await pool.query(`SELECT setval('customers_id_seq', $1)`, [customers.length]);
    console.log();

    // Addresses (batch) - Brazilian format
    console.log('  Inserting addresses...');
    for (let i = 0; i < addresses.length; i += CONFIG.BATCH_SIZE.POSTGRES) {
      const batch = addresses.slice(i, i + CONFIG.BATCH_SIZE.POSTGRES);
      const values: any[] = [];
      const placeholderRows: string[] = [];
      for (let idx = 0; idx < batch.length; idx++) {
        const a = batch[idx];
        const offset = idx * 12;
        const state = BRAZILIAN_STATES[Math.floor(Math.random() * BRAZILIAN_STATES.length)];
        const city = BRAZILIAN_CITIES[Math.floor(Math.random() * BRAZILIAN_CITIES.length)];
        const neighborhood = NEIGHBORHOODS[Math.floor(Math.random() * NEIGHBORHOODS.length)];
        const number = String(faker.number.int({ min: 1, max: 9999 }));
        const complement = Math.random() > 0.5 ? `Apto ${faker.number.int({ min: 1, max: 500 })}` : null;
        const postalCode = generateCEP();
        const isBilling = a.address_type === 'billing';
        values.push(a.id, a.customer_id, a.street_address.substring(0, 255), number, complement, neighborhood, city, state, postalCode, a.is_default, isBilling, `${a.customer_id}-address`);
        placeholderRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`);
      }
      if (values.length > 0) {
        await pool.query(
          `INSERT INTO addresses (id, customer_id, street, number, complement, neighborhood, city, state, postal_code, is_default, is_billing, recipient_name) VALUES ${placeholderRows.join(',')}`,
          values
        );
      }
      process.stdout.write(`\r  Addresses: ${Math.min(i + CONFIG.BATCH_SIZE.POSTGRES, addresses.length)}/${addresses.length}`);
    }
    await pool.query(`SELECT setval('addresses_id_seq', $1)`, [addresses.length]);
    console.log();

    // Orders (batch) - Complex Brazilian schema with denormalized addresses
    // Use smaller batch size for orders due to many columns (20 params per row)
    const ORDER_BATCH_SIZE = 500;
    console.log('  Inserting orders...');
    for (let i = 0; i < orders.length; i += ORDER_BATCH_SIZE) {
      const batch = orders.slice(i, i + ORDER_BATCH_SIZE);
      const values: any[] = [];
      const placeholderRows: string[] = [];

      for (let idx = 0; idx < batch.length; idx++) {
        const o = batch[idx];
        const offset = idx * 20;
        const paymentStatus = PAYMENT_STATUSES[Math.floor(Math.random() * PAYMENT_STATUSES.length)];
        const fulfillmentStatus = FULFILLMENT_STATUSES[Math.floor(Math.random() * FULFILLMENT_STATUSES.length)];
        const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
        const state = BRAZILIAN_STATES[Math.floor(Math.random() * BRAZILIAN_STATES.length)];
        const city = BRAZILIAN_CITIES[Math.floor(Math.random() * BRAZILIAN_CITIES.length)];
        const neighborhood = NEIGHBORHOODS[Math.floor(Math.random() * NEIGHBORHOODS.length)];
        const status = ORDER_STATUSES_PG[Math.floor(Math.random() * ORDER_STATUSES_PG.length)];

        values.push(
          o.id,
          o.order_number.substring(0, 20),
          o.customer_id,
          status,
          paymentStatus,
          fulfillmentStatus,
          o.subtotal,
          o.discount_amount,
          o.shipping_amount,
          o.tax_amount,
          o.total_amount,
          `Cliente ${o.customer_id}`,
          faker.location.street().substring(0, 255),
          String(faker.number.int({ min: 1, max: 999 })),
          neighborhood,
          city,
          state,
          generateCEP(),
          paymentMethod,
          o.created_at
        );
        placeholderRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20})`);
      }

      if (values.length > 0) {
        await pool.query(
          `INSERT INTO orders (id, order_number, customer_id, status, payment_status, fulfillment_status, subtotal, discount_total, shipping_total, tax_total, total, shipping_name, shipping_street, shipping_number, shipping_neighborhood, shipping_city, shipping_state, shipping_postal_code, payment_method, created_at) VALUES ${placeholderRows.join(',')}`,
          values
        );
      }
      process.stdout.write(`\r  Orders: ${Math.min(i + ORDER_BATCH_SIZE, orders.length)}/${orders.length}`);
    }
    await pool.query(`SELECT setval('orders_id_seq', $1)`, [orders.length]);
    console.log();

    // Order Items (batch) - PostgreSQL schema requires sku, name, subtotal
    console.log('  Inserting order items...');
    for (let i = 0; i < orderItems.length; i += CONFIG.BATCH_SIZE.POSTGRES) {
      const batch = orderItems.slice(i, i + CONFIG.BATCH_SIZE.POSTGRES);
      const values: any[] = [];
      const placeholderRows: string[] = [];
      for (let idx = 0; idx < batch.length; idx++) {
        const oi = batch[idx];
        const offset = idx * 7;
        const product = products[oi.product_id - 1];
        values.push(oi.order_id, oi.product_id, product.sku, product.name.substring(0, 255), oi.quantity, oi.unit_price, oi.total_price);
        placeholderRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
      }
      if (values.length > 0) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, sku, name, quantity, unit_price, subtotal) VALUES ${placeholderRows.join(',')}`,
          values
        );
      }
      process.stdout.write(`\r  Order items: ${Math.min(i + CONFIG.BATCH_SIZE.POSTGRES, orderItems.length)}/${orderItems.length}`);
    }
    console.log();

    // Reviews (batch) - PostgreSQL schema uses 'content' instead of 'comment'
    console.log('  Inserting reviews...');
    for (let i = 0; i < reviews.length; i += CONFIG.BATCH_SIZE.POSTGRES) {
      const batch = reviews.slice(i, i + CONFIG.BATCH_SIZE.POSTGRES);
      const values: any[] = [];
      const placeholderRows: string[] = [];
      for (let idx = 0; idx < batch.length; idx++) {
        const r = batch[idx];
        const offset = idx * 6;
        values.push(r.product_id, r.customer_id, r.rating, r.title, r.comment, r.is_verified_purchase);
        placeholderRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
      }
      if (values.length > 0) {
        await pool.query(
          `INSERT INTO reviews (product_id, customer_id, rating, title, content, is_verified_purchase) VALUES ${placeholderRows.join(',')}`,
          values
        );
      }
      process.stdout.write(`\r  Reviews: ${Math.min(i + CONFIG.BATCH_SIZE.POSTGRES, reviews.length)}/${reviews.length}`);
    }
    console.log();

    console.log('  ✅ PostgreSQL seeded successfully!');
  } finally {
    await pool.end();
  }
}

async function seedMysql(
  categories: Category[],
  products: Product[],
  customers: Customer[],
  addresses: Address[],
  orders: Order[],
  orderItems: OrderItem[],
  reviews: Review[]
) {
  console.log('\n🐬 Seeding MySQL...');
  const conn = await mysql.createConnection(CONFIG.MYSQL);

  try {
    // Disable foreign key checks for faster inserts
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('SET UNIQUE_CHECKS = 0');

    // Clear existing data
    console.log('  Clearing existing data...');
    await conn.query('TRUNCATE TABLE reviews');
    await conn.query('TRUNCATE TABLE order_items');
    await conn.query('TRUNCATE TABLE orders');
    await conn.query('TRUNCATE TABLE addresses');
    await conn.query('TRUNCATE TABLE customers');
    await conn.query('TRUNCATE TABLE products');
    await conn.query('TRUNCATE TABLE categories');

    // Categories
    console.log('  Inserting categories...');
    const catValues = categories.map((c) => [c.id, c.name, c.description, c.parent_id]);
    await conn.query('INSERT INTO categories (id, name, description, parent_id) VALUES ?', [catValues]);

    // Products (batch)
    console.log('  Inserting products...');
    for (let i = 0; i < products.length; i += CONFIG.BATCH_SIZE.MYSQL) {
      const batch = products.slice(i, i + CONFIG.BATCH_SIZE.MYSQL);
      const values = batch.map((p) => [p.id, p.sku, p.name, p.description, p.price, p.cost, p.stock_quantity, p.category_id, p.is_active, p.weight]);
      await conn.query(
        'INSERT INTO products (id, sku, name, description, price, cost, stock_quantity, category_id, is_active, weight) VALUES ?',
        [values]
      );
      process.stdout.write(`\r  Products: ${Math.min(i + CONFIG.BATCH_SIZE.MYSQL, products.length)}/${products.length}`);
    }
    console.log();

    // Customers (batch)
    console.log('  Inserting customers...');
    for (let i = 0; i < customers.length; i += CONFIG.BATCH_SIZE.MYSQL) {
      const batch = customers.slice(i, i + CONFIG.BATCH_SIZE.MYSQL);
      const values = batch.map((c) => [c.id, c.email, c.first_name, c.last_name, c.phone, c.date_of_birth]);
      await conn.query(
        'INSERT INTO customers (id, email, first_name, last_name, phone, date_of_birth) VALUES ?',
        [values]
      );
      process.stdout.write(`\r  Customers: ${Math.min(i + CONFIG.BATCH_SIZE.MYSQL, customers.length)}/${customers.length}`);
    }
    console.log();

    // Addresses (batch)
    console.log('  Inserting addresses...');
    for (let i = 0; i < addresses.length; i += CONFIG.BATCH_SIZE.MYSQL) {
      const batch = addresses.slice(i, i + CONFIG.BATCH_SIZE.MYSQL);
      const values = batch.map((a) => [a.id, a.customer_id, a.address_type, a.street_address, a.city, a.state, a.postal_code, a.country, a.is_default]);
      await conn.query(
        'INSERT INTO addresses (id, customer_id, address_type, street_address, city, state, postal_code, country, is_default) VALUES ?',
        [values]
      );
      process.stdout.write(`\r  Addresses: ${Math.min(i + CONFIG.BATCH_SIZE.MYSQL, addresses.length)}/${addresses.length}`);
    }
    console.log();

    // Orders (batch)
    console.log('  Inserting orders...');
    for (let i = 0; i < orders.length; i += CONFIG.BATCH_SIZE.MYSQL) {
      const batch = orders.slice(i, i + CONFIG.BATCH_SIZE.MYSQL);
      const values = batch.map((o) => [o.id, o.order_number, o.customer_id, o.status, o.subtotal, o.tax_amount, o.shipping_amount, o.discount_amount, o.total_amount, o.shipping_address_id, o.billing_address_id, o.created_at]);
      await conn.query(
        'INSERT INTO orders (id, order_number, customer_id, status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address_id, billing_address_id, created_at) VALUES ?',
        [values]
      );
      process.stdout.write(`\r  Orders: ${Math.min(i + CONFIG.BATCH_SIZE.MYSQL, orders.length)}/${orders.length}`);
    }
    console.log();

    // Order Items (batch)
    console.log('  Inserting order items...');
    for (let i = 0; i < orderItems.length; i += CONFIG.BATCH_SIZE.MYSQL) {
      const batch = orderItems.slice(i, i + CONFIG.BATCH_SIZE.MYSQL);
      const values = batch.map((oi) => [oi.order_id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price]);
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ?',
        [values]
      );
      process.stdout.write(`\r  Order items: ${Math.min(i + CONFIG.BATCH_SIZE.MYSQL, orderItems.length)}/${orderItems.length}`);
    }
    console.log();

    // Reviews (batch)
    console.log('  Inserting reviews...');
    for (let i = 0; i < reviews.length; i += CONFIG.BATCH_SIZE.MYSQL) {
      const batch = reviews.slice(i, i + CONFIG.BATCH_SIZE.MYSQL);
      const values = batch.map((r) => [r.product_id, r.customer_id, r.rating, r.title, r.comment, r.is_verified_purchase]);
      await conn.query(
        'INSERT INTO reviews (product_id, customer_id, rating, title, comment, is_verified_purchase) VALUES ?',
        [values]
      );
      process.stdout.write(`\r  Reviews: ${Math.min(i + CONFIG.BATCH_SIZE.MYSQL, reviews.length)}/${reviews.length}`);
    }
    console.log();

    // Re-enable checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.query('SET UNIQUE_CHECKS = 1');

    console.log('  ✅ MySQL seeded successfully!');
  } finally {
    await conn.end();
  }
}

async function seedSqlServer(
  categories: Category[],
  products: Product[],
  customers: Customer[],
  addresses: Address[],
  orders: Order[],
  orderItems: OrderItem[],
  reviews: Review[]
) {
  console.log('\n🔷 Seeding SQL Server...');

  let pool: sql.ConnectionPool | null = null;

  try {
    // First connect to master to ensure database exists
    pool = await sql.connect(CONFIG.SQLSERVER);

    // Check if database exists, create if needed
    console.log('  Setting up database...');
    await pool.query`
      IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ecommerce_demo')
      BEGIN
          CREATE DATABASE ecommerce_demo;
      END
    `;
    await pool.close();

    // Now connect directly to ecommerce_demo
    const ecommerceConfig = {
      ...CONFIG.SQLSERVER,
      database: 'ecommerce_demo',
    };
    pool = await sql.connect(ecommerceConfig);

    // Run schema creation (this is idempotent)
    const schemaPath = 'docker/sqlserver-ecommerce/schema.sql';
    const fs = await import('fs');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      // Split by GO and execute each batch, skip USE and CREATE DATABASE statements
      const batches = schema.split(/\nGO\s*\n/i).filter((b) => {
        const trimmed = b.trim().toUpperCase();
        return trimmed && !trimmed.startsWith('USE ') && !trimmed.includes('CREATE DATABASE');
      });
      for (const batch of batches) {
        if (batch.trim()) {
          try {
            await pool!.query(batch);
          } catch (e) {
            // Ignore errors for IF NOT EXISTS statements
          }
        }
      }
    }

    // Clear existing data
    console.log('  Clearing existing data...');
    await pool.query`DELETE FROM reviews`;
    await pool.query`DELETE FROM order_items`;
    await pool.query`DELETE FROM orders`;
    await pool.query`DELETE FROM addresses`;
    await pool.query`DELETE FROM customers`;
    await pool.query`DELETE FROM inventory_log`;
    await pool.query`DELETE FROM products`;
    await pool.query`DELETE FROM categories`;

    // Reset identity seeds
    await pool.query`DBCC CHECKIDENT ('categories', RESEED, 0)`;
    await pool.query`DBCC CHECKIDENT ('products', RESEED, 0)`;
    await pool.query`DBCC CHECKIDENT ('customers', RESEED, 0)`;
    await pool.query`DBCC CHECKIDENT ('addresses', RESEED, 0)`;
    await pool.query`DBCC CHECKIDENT ('orders', RESEED, 0)`;
    await pool.query`DBCC CHECKIDENT ('order_items', RESEED, 0)`;
    await pool.query`DBCC CHECKIDENT ('reviews', RESEED, 0)`;

    // Categories (no explicit id)
    console.log('  Inserting categories...');
    for (const cat of categories) {
      await pool.query`
        INSERT INTO categories (name, description, parent_id)
        VALUES (${cat.name}, ${cat.description}, ${cat.parent_id})
      `;
    }

    // Products (no explicit id)
    console.log('  Inserting products...');
    for (let i = 0; i < products.length; i += CONFIG.BATCH_SIZE.SQLSERVER) {
      const batch = products.slice(i, i + CONFIG.BATCH_SIZE.SQLSERVER);
      for (const p of batch) {
        await pool.query`
          INSERT INTO products (sku, name, description, price, cost, stock_quantity, category_id, is_active, weight)
          VALUES (${p.sku}, ${p.name}, ${p.description}, ${p.price}, ${p.cost}, ${p.stock_quantity}, ${p.category_id}, ${p.is_active ? 1 : 0}, ${p.weight})
        `;
      }
      process.stdout.write(`\r  Products: ${Math.min(i + CONFIG.BATCH_SIZE.SQLSERVER, products.length)}/${products.length}`);
    }
    console.log();

    // Customers (no explicit id)
    console.log('  Inserting customers...');
    for (let i = 0; i < customers.length; i += CONFIG.BATCH_SIZE.SQLSERVER) {
      const batch = customers.slice(i, i + CONFIG.BATCH_SIZE.SQLSERVER);
      for (const c of batch) {
        await pool.query`
          INSERT INTO customers (email, first_name, last_name, phone, date_of_birth)
          VALUES (${c.email}, ${c.first_name}, ${c.last_name}, ${c.phone}, ${c.date_of_birth})
        `;
      }
      process.stdout.write(`\r  Customers: ${Math.min(i + CONFIG.BATCH_SIZE.SQLSERVER, customers.length)}/${customers.length}`);
    }
    console.log();

    // Addresses (no explicit id)
    console.log('  Inserting addresses...');
    for (let i = 0; i < addresses.length; i += CONFIG.BATCH_SIZE.SQLSERVER) {
      const batch = addresses.slice(i, i + CONFIG.BATCH_SIZE.SQLSERVER);
      for (const a of batch) {
        await pool.query`
          INSERT INTO addresses (customer_id, address_type, street_address, city, state, postal_code, country, is_default)
          VALUES (${a.customer_id}, ${a.address_type}, ${a.street_address}, ${a.city}, ${a.state}, ${a.postal_code}, ${a.country}, ${a.is_default ? 1 : 0})
        `;
      }
      process.stdout.write(`\r  Addresses: ${Math.min(i + CONFIG.BATCH_SIZE.SQLSERVER, addresses.length)}/${addresses.length}`);
    }
    console.log();

    // Orders (no explicit id, use address IDs based on customer relationship)
    console.log('  Inserting orders...');
    for (let i = 0; i < orders.length; i += CONFIG.BATCH_SIZE.SQLSERVER) {
      const batch = orders.slice(i, i + CONFIG.BATCH_SIZE.SQLSERVER);
      for (const o of batch) {
        await pool.query`
          INSERT INTO orders (order_number, customer_id, status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address_id, billing_address_id, created_at)
          VALUES (${o.order_number}, ${o.customer_id}, ${o.status}, ${o.subtotal}, ${o.tax_amount}, ${o.shipping_amount}, ${o.discount_amount}, ${o.total_amount}, ${o.shipping_address_id}, ${o.billing_address_id}, ${o.created_at})
        `;
      }
      process.stdout.write(`\r  Orders: ${Math.min(i + CONFIG.BATCH_SIZE.SQLSERVER, orders.length)}/${orders.length}`);
    }
    console.log();

    // Order Items (no explicit id)
    console.log('  Inserting order items...');
    for (let i = 0; i < orderItems.length; i += CONFIG.BATCH_SIZE.SQLSERVER) {
      const batch = orderItems.slice(i, i + CONFIG.BATCH_SIZE.SQLSERVER);
      for (const oi of batch) {
        await pool.query`
          INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
          VALUES (${oi.order_id}, ${oi.product_id}, ${oi.quantity}, ${oi.unit_price}, ${oi.total_price})
        `;
      }
      process.stdout.write(`\r  Order items: ${Math.min(i + CONFIG.BATCH_SIZE.SQLSERVER, orderItems.length)}/${orderItems.length}`);
    }
    console.log();

    // Reviews
    console.log('  Inserting reviews...');
    for (let i = 0; i < reviews.length; i += CONFIG.BATCH_SIZE.SQLSERVER) {
      const batch = reviews.slice(i, i + CONFIG.BATCH_SIZE.SQLSERVER);
      for (const r of batch) {
        await pool.query`
          INSERT INTO reviews (product_id, customer_id, rating, title, comment, is_verified_purchase)
          VALUES (${r.product_id}, ${r.customer_id}, ${r.rating}, ${r.title}, ${r.comment}, ${r.is_verified_purchase ? 1 : 0})
        `;
      }
      process.stdout.write(`\r  Reviews: ${Math.min(i + CONFIG.BATCH_SIZE.SQLSERVER, reviews.length)}/${reviews.length}`);
    }
    console.log();

    console.log('  ✅ SQL Server seeded successfully!');
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

async function seedMongodb(
  categories: Category[],
  products: Product[],
  customers: Customer[],
  addresses: Address[],
  orders: Order[],
  orderItems: OrderItem[],
  reviews: Review[]
) {
  console.log('\n🍃 Seeding MongoDB...');
  const client = new MongoClient(CONFIG.MONGODB.url);

  try {
    await client.connect();
    const db: Db = client.db(CONFIG.MONGODB.database);

    // Clear existing data - drop and recreate collections to remove any validators
    console.log('  Clearing existing data...');
    const collections = ['categories', 'products', 'customers', 'orders', 'reviews', 'inventoryLog'];
    for (const col of collections) {
      try {
        await db.collection(col).drop();
      } catch {
        // Collection might not exist
      }
    }

    // Categories
    console.log('  Inserting categories...');
    const mongoCats = categories.map((c) => ({
      _id: c.id as unknown as import('mongodb').ObjectId,
      name: c.name,
      description: c.description,
      parentId: c.parent_id,
      createdAt: new Date(),
    }));
    await db.collection('categories').insertMany(mongoCats);

    // Products (batch)
    console.log('  Inserting products...');
    for (let i = 0; i < products.length; i += CONFIG.BATCH_SIZE.MONGODB) {
      const batch = products.slice(i, i + CONFIG.BATCH_SIZE.MONGODB);
      const mongoBatch = batch.map((p) => ({
        _id: p.id as unknown as import('mongodb').ObjectId,
        sku: p.sku,
        name: p.name,
        description: p.description,
        price: p.price,
        cost: p.cost,
        stockQuantity: p.stock_quantity,
        categoryId: p.category_id,
        isActive: p.is_active,
        weight: p.weight,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await db.collection('products').insertMany(mongoBatch);
      process.stdout.write(`\r  Products: ${Math.min(i + CONFIG.BATCH_SIZE.MONGODB, products.length)}/${products.length}`);
    }
    console.log();

    // Customers with embedded addresses
    console.log('  Inserting customers with addresses...');
    const addressMap = new Map<number, Address[]>();
    for (const addr of addresses) {
      if (!addressMap.has(addr.customer_id)) {
        addressMap.set(addr.customer_id, []);
      }
      addressMap.get(addr.customer_id)!.push(addr);
    }

    for (let i = 0; i < customers.length; i += CONFIG.BATCH_SIZE.MONGODB) {
      const batch = customers.slice(i, i + CONFIG.BATCH_SIZE.MONGODB);
      const mongoBatch = batch.map((c) => ({
        _id: c.id as unknown as import('mongodb').ObjectId,
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        phone: c.phone,
        dateOfBirth: c.date_of_birth,
        addresses: (addressMap.get(c.id) || []).map((a) => ({
          type: a.address_type,
          streetAddress: a.street_address,
          city: a.city,
          state: a.state,
          postalCode: a.postal_code,
          country: a.country,
          isDefault: a.is_default,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await db.collection('customers').insertMany(mongoBatch);
      process.stdout.write(`\r  Customers: ${Math.min(i + CONFIG.BATCH_SIZE.MONGODB, customers.length)}/${customers.length}`);
    }
    console.log();

    // Orders with embedded items
    console.log('  Inserting orders with items...');
    const orderItemsMap = new Map<number, OrderItem[]>();
    for (const item of orderItems) {
      if (!orderItemsMap.has(item.order_id)) {
        orderItemsMap.set(item.order_id, []);
      }
      orderItemsMap.get(item.order_id)!.push(item);
    }

    for (let i = 0; i < orders.length; i += CONFIG.BATCH_SIZE.MONGODB) {
      const batch = orders.slice(i, i + CONFIG.BATCH_SIZE.MONGODB);
      const mongoBatch = batch.map((o) => ({
        _id: o.id as unknown as import('mongodb').ObjectId,
        orderNumber: o.order_number,
        customerId: o.customer_id,
        status: o.status,
        subtotal: o.subtotal,
        taxAmount: o.tax_amount,
        shippingAmount: o.shipping_amount,
        discountAmount: o.discount_amount,
        totalAmount: o.total_amount,
        items: (orderItemsMap.get(o.id) || []).map((oi) => ({
          productId: oi.product_id,
          quantity: oi.quantity,
          unitPrice: oi.unit_price,
          totalPrice: oi.total_price,
        })),
        createdAt: o.created_at,
        updatedAt: new Date(),
      }));
      await db.collection('orders').insertMany(mongoBatch);
      process.stdout.write(`\r  Orders: ${Math.min(i + CONFIG.BATCH_SIZE.MONGODB, orders.length)}/${orders.length}`);
    }
    console.log();

    // Reviews
    console.log('  Inserting reviews...');
    for (let i = 0; i < reviews.length; i += CONFIG.BATCH_SIZE.MONGODB) {
      const batch = reviews.slice(i, i + CONFIG.BATCH_SIZE.MONGODB);
      const mongoBatch = batch.map((r) => ({
        productId: r.product_id,
        customerId: r.customer_id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isVerifiedPurchase: r.is_verified_purchase,
        createdAt: new Date(),
      }));
      await db.collection('reviews').insertMany(mongoBatch);
      process.stdout.write(`\r  Reviews: ${Math.min(i + CONFIG.BATCH_SIZE.MONGODB, reviews.length)}/${reviews.length}`);
    }
    console.log();

    console.log('  ✅ MongoDB seeded successfully!');
  } finally {
    await client.close();
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const startTime = Date.now();

  console.log('🔄 Generating data...\n');

  // Generate all data first
  const categories = generateCategories();
  const products = generateProducts(categories.length);
  const customers = generateCustomers();
  const addresses = generateAddresses(customers.length);
  const { orders, orderItems } = generateOrdersAndItems(
    customers.length,
    products.length,
    addresses.length,
    products
  );
  const reviews = generateReviews(products.length, customers.length);

  console.log(`
📊 Data Generated:
   Categories:   ${categories.length.toLocaleString()}
   Products:     ${products.length.toLocaleString()}
   Customers:    ${customers.length.toLocaleString()}
   Addresses:    ${addresses.length.toLocaleString()}
   Orders:       ${orders.length.toLocaleString()}
   Order Items:  ${orderItems.length.toLocaleString()}
   Reviews:      ${reviews.length.toLocaleString()}
`);

  // Seed databases based on target
  const dbsToSeed = targetDb
    ? [targetDb]
    : ['postgres', 'mysql', 'sqlserver', 'mongodb'];

  for (const db of dbsToSeed) {
    try {
      switch (db) {
        case 'postgres':
          await seedPostgres(categories, products, customers, addresses, orders, orderItems, reviews);
          break;
        case 'mysql':
          await seedMysql(categories, products, customers, addresses, orders, orderItems, reviews);
          break;
        case 'sqlserver':
          await seedSqlServer(categories, products, customers, addresses, orders, orderItems, reviews);
          break;
        case 'mongodb':
          await seedMongodb(categories, products, customers, addresses, orders, orderItems, reviews);
          break;
        default:
          console.log(`⚠️ Unknown database: ${db}`);
      }
    } catch (error) {
      console.error(`\n❌ Error seeding ${db}:`, error);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    SEED COMPLETE                           ║
╠════════════════════════════════════════════════════════════╣
║  Total time: ${duration.padStart(6)}s                                    ║
╚════════════════════════════════════════════════════════════╝
`);
}

main().catch(console.error);
