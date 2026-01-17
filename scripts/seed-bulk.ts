import { PrismaClient } from '@prisma/client';
import { query } from '../src/lib/pg-client';

const prisma = new PrismaClient();

// Helper to generate random data
const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPrice = (min: number, max: number): number => +(Math.random() * (max - min) + min).toFixed(2);
const randomDate = (daysAgo: number): Date => new Date(Date.now() - randomInt(0, daysAgo) * 24 * 60 * 60 * 1000);
const formatDate = (d: Date): string => d.toISOString().slice(0, 19).replace('T', ' ');

// Brazilian data
const firstNames = ['Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Kevin', 'Laura', 'Marcos', 'Natalia', 'Oscar', 'Patricia', 'Rafael', 'Sofia', 'Thiago', 'Vanessa', 'William', 'Yasmin', 'Lucas', 'Maria', 'Pedro', 'Camila', 'Diego', 'Amanda', 'Felipe', 'Bianca'];
const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida', 'Pereira', 'Lima', 'Carvalho', 'Ribeiro', 'Gomes', 'Martins', 'Costa', 'Nascimento', 'Barbosa', 'Mendes', 'Castro', 'Araujo', 'Rocha'];
const neighborhoods = ['Centro', 'Jardins', 'Vila Mariana', 'Pinheiros', 'Moema', 'Itaim Bibi', 'Consolacao', 'Liberdade', 'Bela Vista', 'Perdizes'];
const streets = ['Rua das Flores', 'Av. Brasil', 'Rua Parana', 'Av. Paulista', 'Rua Augusta', 'Av. Atlantica', 'Rua Oscar Freire', 'Av. Rio Branco', 'Rua da Consolacao', 'Av. Presidente Vargas'];
const cities = [
  { city: 'Sao Paulo', state: 'SP' },
  { city: 'Rio de Janeiro', state: 'RJ' },
  { city: 'Belo Horizonte', state: 'MG' },
  { city: 'Curitiba', state: 'PR' },
  { city: 'Porto Alegre', state: 'RS' },
  { city: 'Salvador', state: 'BA' },
  { city: 'Fortaleza', state: 'CE' },
  { city: 'Brasilia', state: 'DF' },
  { city: 'Recife', state: 'PE' },
  { city: 'Florianopolis', state: 'SC' },
];
const brands = ['TechMaster', 'ElectroMax', 'ByteForce', 'DigiPro', 'SmartGear', 'PowerTech', 'NexGen', 'ProLine', 'UltraCore', 'PrimeTech'];
const productPrefixes = ['Pro', 'Ultra', 'Max', 'Elite', 'Basic', 'Advanced', 'Premium', 'Standard', 'Lite', 'Plus'];
const productTypes = ['Mouse', 'Teclado', 'Monitor', 'Headset', 'Webcam', 'Caixa de Som', 'Cabo USB', 'Adaptador', 'Hub USB', 'Dock Station', 'SSD', 'Memoria RAM', 'Placa de Video', 'Processador', 'Gabinete', 'Cooler', 'Fonte', 'Placa Mae', 'Mousepad', 'Suporte Monitor'];
const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const paymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
const paymentMethods = ['pix', 'credit_card', 'boleto', 'debit_card'];
const shippingMethods = ['PAC', 'SEDEX', 'SEDEX 10', 'Transportadora', 'Retirada'];
const shippingCarriers = ['Correios', 'Jadlog', 'Total Express', 'Azul Cargo', null];

// Escape single quotes for SQL
const esc = (s: string | null | undefined) => s ? s.replace(/'/g, "''") : '';

// Generate CPF
const generateCPF = (): string => {
  const n = () => randomInt(0, 9);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
};

// Generate slug
const slugify = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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

  // First, get existing categories
  const existingCategories = await query<{ id: number }>(connStr, 'SELECT id FROM categories ORDER BY id');
  if (existingCategories.length === 0) {
    console.error('No categories found. Please run the seed.sql first.');
    await prisma.$disconnect();
    return;
  }

  // ============================================
  // CUSTOMERS (1000 records)
  // ============================================
  console.log('\n📦 Inserting 1000 customers...');

  const customerValues: string[] = [];
  for (let i = 1; i <= 1000; i++) {
    const firstName = randomFrom(firstNames);
    const lastName = randomFrom(lastNames);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}.${i}@email.com`;
    const cpf = generateCPF();
    const phone = `+55 ${randomInt(11, 99)} 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
    const birthDate = `${randomInt(1960, 2005)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`;
    const gender = randomFrom(['masculino', 'feminino', null]);
    const isActive = Math.random() > 0.1;
    const isVerified = Math.random() > 0.3;
    const marketingConsent = Math.random() > 0.4;
    const notes = Math.random() > 0.8 ? `Observacao cliente ${i}` : null;
    const createdAt = formatDate(randomDate(365));

    customerValues.push(
      `('${email}', '${cpf}', '${esc(firstName)}', '${esc(lastName)}', '${phone}', '${birthDate}', ${gender ? `'${gender}'` : 'NULL'}, ${isActive}, ${isVerified}, ${marketingConsent}, ${notes ? `'${esc(notes)}'` : 'NULL'}, '${createdAt}')`
    );
  }

  try {
    await query(connStr, `
      INSERT INTO customers (email, cpf, first_name, last_name, phone, birth_date, gender, is_active, is_verified, marketing_consent, notes, created_at)
      VALUES ${customerValues.join(',\n')}
    `);
    console.log('✅ 1000 customers inserted');
  } catch (error: any) {
    console.error('Error inserting customers:', error.message);
  }

  // ============================================
  // ADDRESSES (1500 records, 1-3 per customer)
  // ============================================
  console.log('\n📦 Inserting addresses...');

  const customers = await query<{ id: number }>(connStr, 'SELECT id FROM customers ORDER BY id');
  const addressValues: string[] = [];

  for (const customer of customers) {
    const addressCount = randomInt(1, 3);
    for (let a = 0; a < addressCount; a++) {
      const cityData = randomFrom(cities);
      const label = a === 0 ? 'Casa' : (a === 1 ? 'Trabalho' : 'Outro');
      const street = randomFrom(streets);
      const number = String(randomInt(1, 2000));
      const complement = Math.random() > 0.5 ? `Apto ${randomInt(1, 500)}` : null;
      const neighborhood = randomFrom(neighborhoods);
      const postalCode = `${randomInt(10000, 99999)}-${randomInt(100, 999)}`;
      const isDefault = a === 0;
      const isBilling = a === 0;

      addressValues.push(
        `(${customer.id}, '${label}', '${esc(street)}', '${number}', ${complement ? `'${esc(complement)}'` : 'NULL'}, '${neighborhood}', '${cityData.city}', '${cityData.state}', '${postalCode}', ${isDefault}, ${isBilling})`
      );
    }
  }

  try {
    await query(connStr, `
      INSERT INTO addresses (customer_id, label, street, number, complement, neighborhood, city, state, postal_code, is_default, is_billing)
      VALUES ${addressValues.join(',\n')}
    `);
    console.log(`✅ ${addressValues.length} addresses inserted`);
  } catch (error: any) {
    console.error('Error inserting addresses:', error.message);
  }

  // ============================================
  // PRODUCTS (500 records)
  // ============================================
  console.log('\n📦 Inserting 500 products...');

  const productValues: string[] = [];
  for (let i = 1; i <= 500; i++) {
    const prefix = randomFrom(productPrefixes);
    const type = randomFrom(productTypes);
    const name = `${prefix} ${type} ${randomInt(100, 999)}`;
    const sku = `${type.substring(0, 3).toUpperCase()}-${timestamp}-${String(i).padStart(4, '0')}`;
    const slug = slugify(`${name}-${sku}`);
    const description = `${type} de alta qualidade da linha ${prefix}. Ideal para uso profissional e gamer. Garantia de 12 meses.`;
    const shortDescription = `${type} ${prefix} com tecnologia avancada`;
    const categoryId = randomFrom(existingCategories).id;
    const price = randomPrice(49.99, 4999.99);
    const compareAtPrice = Math.random() > 0.5 ? +(price * 1.2).toFixed(2) : null;
    const costPrice = +(price * randomPrice(0.4, 0.6)).toFixed(2);
    const stock = randomInt(0, 500);
    const lowStock = randomInt(5, 20);
    const weight = randomPrice(0.1, 5);
    const brand = randomFrom(brands);
    const barcode = Math.random() > 0.3 ? `789${randomInt(1000000000, 9999999999)}` : null;
    const isActive = Math.random() > 0.1;
    const isFeatured = Math.random() > 0.85;
    const createdAt = formatDate(randomDate(365));

    productValues.push(
      `('${sku}', '${esc(name)}', '${slug}', '${esc(description)}', '${esc(shortDescription)}', ${categoryId}, ${price}, ${compareAtPrice || 'NULL'}, ${costPrice}, ${stock}, ${lowStock}, ${weight}, '${brand}', ${barcode ? `'${barcode}'` : 'NULL'}, ${isActive}, ${isFeatured}, '${createdAt}')`
    );
  }

  try {
    await query(connStr, `
      INSERT INTO products (sku, name, slug, description, short_description, category_id, price, compare_at_price, cost_price, stock_quantity, low_stock_threshold, weight_kg, brand, barcode, is_active, is_featured, created_at)
      VALUES ${productValues.join(',\n')}
    `);
    console.log('✅ 500 products inserted');
  } catch (error: any) {
    console.error('Error inserting products:', error.message);
  }

  // Refresh products list
  const products = await query<{ id: number; sku: string; name: string; price: number; weight_kg: number }>(
    connStr,
    'SELECT id, sku, name, price, weight_kg FROM products ORDER BY id'
  );

  if (products.length === 0) {
    console.error('No products found');
    await prisma.$disconnect();
    return;
  }

  // ============================================
  // ORDERS (2000 records)
  // ============================================
  console.log('\n📦 Inserting 2000 orders...');

  const orderValues: string[] = [];

  for (let i = 1; i <= 2000; i++) {
    const customerId = randomFrom(customers).id;
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(timestamp).slice(-6)}${String(i).padStart(4, '0')}`;
    const status = randomFrom(statuses);
    const paymentStatus = status === 'cancelled' ? 'refunded' : (status === 'pending' ? 'pending' : 'paid');
    const fulfillmentStatus = status === 'delivered' ? 'fulfilled' : (status === 'shipped' ? 'partially_fulfilled' : 'unfulfilled');

    const subtotal = randomPrice(100, 5000);
    const discountTotal = Math.random() > 0.7 ? +(subtotal * randomPrice(0.05, 0.2)).toFixed(2) : 0;
    const shippingTotal = randomPrice(0, 80);
    const taxTotal = 0;
    const total = +(subtotal - discountTotal + shippingTotal).toFixed(2);

    const cityData = randomFrom(cities);
    const shippingStreet = randomFrom(streets);
    const shippingNumber = String(randomInt(1, 2000));
    const shippingNeighborhood = randomFrom(neighborhoods);
    const shippingPostalCode = `${randomInt(10000, 99999)}-${randomInt(100, 999)}`;

    const shippingMethod = randomFrom(shippingMethods);
    const shippingCarrier = randomFrom(shippingCarriers);
    const trackingNumber = status === 'shipped' || status === 'delivered' ? `BR${randomInt(100000000, 999999999)}BR` : null;

    const paymentMethod = randomFrom(paymentMethods);
    const createdAt = randomDate(365);
    const shippedAt = status === 'shipped' || status === 'delivered' ? formatDate(new Date(createdAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000)) : null;
    const deliveredAt = status === 'delivered' ? formatDate(new Date(createdAt.getTime() + randomInt(5, 15) * 24 * 60 * 60 * 1000)) : null;
    const paidAt = paymentStatus === 'paid' ? formatDate(new Date(createdAt.getTime() + randomInt(0, 2) * 60 * 60 * 1000)) : null;

    const notes = Math.random() > 0.9 ? 'Entregar no portao' : null;
    const source = randomFrom(['web', 'web', 'web', 'mobile', 'mobile']);

    orderValues.push(
      `('${orderNumber}', ${customerId}, '${status}', '${paymentStatus}', '${fulfillmentStatus}', ${subtotal}, ${discountTotal}, ${shippingTotal}, ${taxTotal}, ${total}, '${esc(shippingStreet)}', '${shippingNumber}', '${shippingNeighborhood}', '${cityData.city}', '${cityData.state}', '${shippingPostalCode}', '${shippingMethod}', ${shippingCarrier ? `'${shippingCarrier}'` : 'NULL'}, ${trackingNumber ? `'${trackingNumber}'` : 'NULL'}, '${paymentMethod}', ${shippedAt ? `'${shippedAt}'` : 'NULL'}, ${deliveredAt ? `'${deliveredAt}'` : 'NULL'}, ${paidAt ? `'${paidAt}'` : 'NULL'}, ${notes ? `'${esc(notes)}'` : 'NULL'}, '${source}', '${formatDate(createdAt)}')`
    );
  }

  try {
    await query(connStr, `
      INSERT INTO orders (order_number, customer_id, status, payment_status, fulfillment_status, subtotal, discount_total, shipping_total, tax_total, total, shipping_street, shipping_number, shipping_neighborhood, shipping_city, shipping_state, shipping_postal_code, shipping_method, shipping_carrier, tracking_number, payment_method, shipped_at, delivered_at, paid_at, notes, source, created_at)
      VALUES ${orderValues.join(',\n')}
    `);
    console.log('✅ 2000 orders inserted');
  } catch (error: any) {
    console.error('Error inserting orders:', error.message);
  }

  // Get order IDs for order items
  const orders = await query<{ id: number }>(connStr, 'SELECT id FROM orders ORDER BY id');

  // ============================================
  // ORDER ITEMS (~6000 records, 2-4 per order)
  // ============================================
  console.log('\n📦 Inserting order items (~6000)...');

  const orderItemValues: string[] = [];

  for (const order of orders) {
    const itemCount = randomInt(2, 4);
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

      const quantity = randomInt(1, 3);
      const unitPrice = product.price;
      const discount = Math.random() > 0.8 ? +(unitPrice * 0.1).toFixed(2) : 0;
      const subtotal = +((unitPrice - discount) * quantity).toFixed(2);
      const weight = product.weight_kg || 0.5;

      orderItemValues.push(
        `(${order.id}, ${product.id}, '${product.sku}', '${esc(product.name)}', ${quantity}, ${unitPrice}, ${discount}, ${subtotal}, ${weight})`
      );
    }
  }

  try {
    // Insert in batches of 1000
    const batchSize = 1000;
    for (let i = 0; i < orderItemValues.length; i += batchSize) {
      const batch = orderItemValues.slice(i, i + batchSize);
      await query(connStr, `
        INSERT INTO order_items (order_id, product_id, sku, name, quantity, unit_price, discount, subtotal, weight_kg)
        VALUES ${batch.join(',\n')}
      `);
    }
    console.log(`✅ ${orderItemValues.length} order items inserted`);
  } catch (error: any) {
    console.error('Error inserting order items:', error.message);
  }

  // ============================================
  // REVIEWS (~400 records, 20% of delivered orders)
  // ============================================
  console.log('\n📦 Inserting reviews...');

  const deliveredOrders = await query<{ id: number; customer_id: number }>(
    connStr,
    "SELECT id, customer_id FROM orders WHERE status = 'delivered' ORDER BY RANDOM() LIMIT 400"
  );

  const reviewValues: string[] = [];
  const reviewTitles = ['Excelente produto!', 'Muito bom', 'Recomendo', 'Otimo custo-beneficio', 'Entrega rapida', 'Produto de qualidade', 'Atendeu expectativas', 'Bom produto', 'Satisfeito com a compra', 'Poderia ser melhor'];
  const reviewContents = [
    'Produto chegou antes do prazo e em perfeitas condicoes.',
    'Qualidade excelente, superou minhas expectativas.',
    'Funciona perfeitamente, recomendo a todos.',
    'Bom produto pelo preco pago.',
    'Entrega foi rapida e o produto veio bem embalado.',
    'Ja comprei outras vezes e sempre fico satisfeito.',
    'Produto conforme descricao, sem surpresas.',
    'Poderia ter mais opcoes de cores.',
  ];

  for (const order of deliveredOrders) {
    const orderItems = await query<{ product_id: number }>(
      connStr,
      `SELECT product_id FROM order_items WHERE order_id = ${order.id} LIMIT 1`
    );
    if (orderItems.length === 0) continue;

    const productId = orderItems[0].product_id;
    const rating = randomFrom([3, 4, 4, 4, 5, 5, 5, 5, 5]);
    const title = randomFrom(reviewTitles);
    const content = randomFrom(reviewContents);
    const isVerified = true;
    const isApproved = Math.random() > 0.1;
    const helpfulCount = randomInt(0, 50);
    const createdAt = formatDate(randomDate(180));

    reviewValues.push(
      `(${productId}, ${order.customer_id}, ${order.id}, ${rating}, '${esc(title)}', '${esc(content)}', ${isVerified}, ${isApproved}, ${helpfulCount}, '${createdAt}')`
    );
  }

  try {
    if (reviewValues.length > 0) {
      await query(connStr, `
        INSERT INTO reviews (product_id, customer_id, order_id, rating, title, content, is_verified_purchase, is_approved, helpful_count, created_at)
        VALUES ${reviewValues.join(',\n')}
      `);
    }
    console.log(`✅ ${reviewValues.length} reviews inserted`);
  } catch (error: any) {
    console.error('Error inserting reviews:', error.message);
  }

  // ============================================
  // UPDATE CUSTOMER STATS
  // ============================================
  console.log('\n📦 Updating customer stats...');

  try {
    await query(connStr, `
      UPDATE customers c SET
        total_orders = (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id),
        total_spent = COALESCE((SELECT SUM(total) FROM orders o WHERE o.customer_id = c.id AND o.payment_status = 'paid'), 0),
        last_order_at = (SELECT MAX(created_at) FROM orders o WHERE o.customer_id = c.id)
    `);
    console.log('✅ Customer stats updated');
  } catch (error: any) {
    console.error('Error updating customer stats:', error.message);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n📊 Final counts:');

  const tables = ['categories', 'customers', 'addresses', 'products', 'orders', 'order_items', 'reviews'];
  for (const table of tables) {
    const result = await query<{ count: string }>(connStr, `SELECT COUNT(*) as count FROM ${table}`);
    console.log(`  ${table}: ${result[0]?.count} records`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Seed completed!');
}

main().catch(console.error);
