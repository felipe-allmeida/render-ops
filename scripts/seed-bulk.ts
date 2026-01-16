import { PrismaClient } from '@prisma/client';
import { query } from '../src/lib/pg-client';

const prisma = new PrismaClient();

// Helper to generate random data
const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPrice = (min: number, max: number): number => +(Math.random() * (max - min) + min).toFixed(2);

// Data for generation
const firstNames = ['Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Kevin', 'Laura', 'Marcos', 'Natalia', 'Oscar', 'Patricia', 'Rafael', 'Sofia', 'Thiago', 'Vanessa', 'William', 'Yasmin', 'Lucas', 'Maria', 'Pedro', 'Camila', 'Diego', 'Amanda', 'Felipe', 'Bianca'];
const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida', 'Pereira', 'Lima', 'Carvalho', 'Ribeiro', 'Gomes', 'Martins', 'Costa', 'Nascimento', 'Barbosa', 'Mendes', 'Castro', 'Araujo', 'Rocha'];
const cities = ['Sao Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Fortaleza', 'Brasilia', 'Recife', 'Manaus', 'Florianopolis', 'Goiania', 'Campinas', 'Santos', 'Natal'];
const states = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'CE', 'DF', 'PE', 'AM', 'SC', 'GO', 'SP', 'SP', 'RN'];
const countries = ['Brazil', 'Brazil', 'Brazil', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Portugal'];
const streets = ['Rua das Flores', 'Av. Brasil', 'Rua Parana', 'Av. Paulista', 'Rua Augusta', 'Av. Atlantica', 'Rua Oscar Freire', 'Av. Rio Branco', 'Rua da Consolacao', 'Av. Presidente Vargas'];
const categories = ['Electronics', 'Accessories', 'Software', 'Hardware', 'Peripherals', 'Networking', 'Storage', 'Audio', 'Video', 'Gaming'];
const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const paymentMethods = ['credit_card', 'debit_card', 'pix', 'boleto', 'paypal'];
const paymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
const productPrefixes = ['Pro', 'Ultra', 'Max', 'Elite', 'Basic', 'Advanced', 'Premium', 'Standard'];
const productTypes = ['Mouse', 'Keyboard', 'Monitor', 'Headset', 'Webcam', 'Speaker', 'Cable', 'Adapter', 'Hub', 'Dock', 'SSD', 'RAM', 'GPU', 'CPU', 'Case', 'Fan', 'PSU', 'Motherboard'];

// Escape single quotes for SQL
const esc = (s: string) => s.replace(/'/g, "''");

async function main() {
  // Get the first connection
  const connection = await prisma.connection.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!connection) {
    console.error('No connection found');
    process.exit(1);
  }

  console.log(`Using connection: ${connection.name}`);
  const connStr = connection.connectionString;

  const timestamp = Date.now();

  // ============================================
  // CUSTOMERS (100 records)
  // ============================================
  console.log('\n📦 Inserting 100 customers...');

  const customerValues: string[] = [];
  for (let i = 1; i <= 100; i++) {
    const firstName = randomFrom(firstNames);
    const lastName = randomFrom(lastNames);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}.${i}@email.com`;
    const phone = `+55 ${randomInt(11, 99)} 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
    const address = `${randomFrom(streets)}, ${randomInt(1, 9999)}`;
    const cityIdx = randomInt(0, cities.length - 1);
    const city = cities[cityIdx];
    const state = states[cityIdx];
    const postalCode = `${randomInt(10000, 99999)}-${randomInt(100, 999)}`;
    const country = randomFrom(countries);
    const isActive = Math.random() > 0.15;
    const notes = Math.random() > 0.7 ? `Customer note ${i}` : null;
    // Random date in last 12 months
    const daysAgo = randomInt(0, 365);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const createdAt = date.toISOString().slice(0, 19).replace('T', ' ');

    customerValues.push(
      `('${esc(firstName)}', '${esc(lastName)}', '${email}', '${phone}', '${esc(address)}', '${city}', '${state}', '${postalCode}', '${country}', ${isActive}, ${notes ? `'${esc(notes)}'` : 'NULL'}, '${createdAt}')`
    );
  }

  try {
    await query(connStr, `
      INSERT INTO customers (first_name, last_name, email, phone, address, city, state, postal_code, country, is_active, notes, created_at)
      VALUES ${customerValues.join(',\n')}
    `);
    console.log('✅ 100 customers inserted');
  } catch (error: any) {
    console.error('Error inserting customers:', error.message);
  }

  // ============================================
  // PRODUCTS (100 records)
  // ============================================
  console.log('\n📦 Inserting 100 products...');

  const productValues: string[] = [];
  for (let i = 1; i <= 100; i++) {
    const prefix = randomFrom(productPrefixes);
    const type = randomFrom(productTypes);
    const name = `${prefix} ${type} ${randomInt(100, 999)}`;
    const description = `High-quality ${type.toLowerCase()} with ${prefix.toLowerCase()} features and specifications`;
    const sku = `${type.substring(0, 3).toUpperCase()}-${prefix.substring(0, 3).toUpperCase()}-${timestamp}-${i}`;
    const price = randomPrice(29.99, 4999.99);
    const cost = +(price * randomPrice(0.4, 0.7)).toFixed(2);
    const stock = randomInt(0, 500);
    const minStock = randomInt(5, 50);
    const category = randomFrom(categories);
    const isActive = Math.random() > 0.1;
    const imageUrl = Math.random() > 0.5 ? `https://example.com/products/${sku}.jpg` : null;
    const daysAgo = randomInt(0, 365);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const createdAt = date.toISOString().slice(0, 19).replace('T', ' ');

    productValues.push(
      `('${sku}', '${esc(name)}', '${esc(description)}', '${category}', ${price}, ${cost}, ${stock}, ${minStock}, ${isActive}, ${imageUrl ? `'${imageUrl}'` : 'NULL'}, '${createdAt}')`
    );
  }

  try {
    await query(connStr, `
      INSERT INTO products (sku, name, description, category, price, cost, stock_quantity, min_stock, is_active, image_url, created_at)
      VALUES ${productValues.join(',\n')}
    `);
    console.log('✅ 100 products inserted');
  } catch (error: any) {
    console.error('Error inserting products:', error.message);
  }

  // Get customer and product IDs for orders
  const customers = await query<{ id: number }>(connStr, 'SELECT id FROM customers ORDER BY id');
  const products = await query<{ id: number; price: number }>(connStr, 'SELECT id, price FROM products ORDER BY id');

  if (customers.length === 0 || products.length === 0) {
    console.error('No customers or products found');
    await prisma.$disconnect();
    return;
  }

  // ============================================
  // ORDERS (100 records)
  // ============================================
  console.log('\n📦 Inserting 100 orders...');

  const orderValues: string[] = [];

  for (let i = 1; i <= 100; i++) {
    const customerId = randomFrom(customers).id;
    const orderNumber = `ORD-${timestamp}-${String(i).padStart(4, '0')}`;
    const status = randomFrom(statuses);
    const subtotal = randomPrice(50, 8000);
    const tax = +(subtotal * 0.1).toFixed(2);
    const shipping = randomPrice(0, 50);
    const total = +(subtotal + tax + shipping).toFixed(2);
    const paymentMethod = randomFrom(paymentMethods);
    const paymentStatus = status === 'cancelled' ? 'refunded' : (status === 'pending' ? 'pending' : 'paid');
    const shippingAddress = `${randomFrom(streets)}, ${randomInt(1, 9999)} - ${randomFrom(cities)}`;
    const notes = Math.random() > 0.7 ? `Order note ${i}` : null;
    const daysAgo = randomInt(0, 365);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const createdAt = date.toISOString().slice(0, 19).replace('T', ' ');

    orderValues.push(
      `(${customerId}, '${orderNumber}', '${status}', ${subtotal}, ${tax}, ${shipping}, ${total}, '${paymentMethod}', '${paymentStatus}', '${esc(shippingAddress)}', ${notes ? `'${esc(notes)}'` : 'NULL'}, '${createdAt}')`
    );
  }

  try {
    await query(connStr, `
      INSERT INTO orders (customer_id, order_number, status, subtotal, tax, shipping, total, payment_method, payment_status, shipping_address, notes, created_at)
      VALUES ${orderValues.join(',\n')}
    `);
    console.log('✅ 100 orders inserted');
  } catch (error: any) {
    console.error('Error inserting orders:', error.message);
  }

  // Get order IDs for order items
  const orders = await query<{ id: number }>(connStr, 'SELECT id FROM orders ORDER BY id');

  // ============================================
  // ORDER ITEMS (~200-300 records, 2-3 per order)
  // ============================================
  console.log('\n📦 Inserting order items...');

  const orderItemValues: string[] = [];

  for (const order of orders) {
    const itemCount = randomInt(1, 4);
    const usedProducts = new Set<number>();

    for (let i = 0; i < itemCount; i++) {
      let product = randomFrom(products);
      // Avoid duplicate products in same order
      let attempts = 0;
      while (usedProducts.has(product.id) && attempts < 10) {
        product = randomFrom(products);
        attempts++;
      }
      if (usedProducts.has(product.id)) continue;
      usedProducts.add(product.id);

      const quantity = randomInt(1, 5);
      const unitPrice = product.price;
      const total = +(quantity * unitPrice).toFixed(2);

      orderItemValues.push(
        `(${order.id}, ${product.id}, ${quantity}, ${unitPrice}, ${total})`
      );
    }
  }

  try {
    await query(connStr, `
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, total)
      VALUES ${orderItemValues.join(',\n')}
    `);
    console.log(`✅ ${orderItemValues.length} order items inserted`);
  } catch (error: any) {
    console.error('Error inserting order items:', error.message);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n📊 Final counts:');

  const tables = ['customers', 'products', 'orders', 'order_items'];
  for (const table of tables) {
    const result = await query<{ count: string }>(connStr, `SELECT COUNT(*) as count FROM ${table}`);
    console.log(`  ${table}: ${result[0]?.count} records`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Seed completed!');
}

main().catch(console.error);
