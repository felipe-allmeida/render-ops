/**
 * E-commerce Database Bulk Data Generator
 *
 * Generates realistic Brazilian e-commerce data for demonstration purposes.
 *
 * Usage:
 *   npx tsx scripts/seed-ecommerce.ts
 *
 * Environment:
 *   ECOMMERCE_DATABASE_URL - PostgreSQL connection string (default: localhost:5433)
 */

import { Pool } from 'pg';

// Configuration
const CONFIG = {
  customers: 1000,
  ordersPerCustomer: { min: 1, max: 5 },
  itemsPerOrder: { min: 1, max: 6 },
  addressesPerCustomer: { min: 1, max: 3 },
  reviewPercentage: 0.2, // 20% of delivered orders get reviews
  inventoryMovementsPerProduct: { min: 3, max: 10 },
};

// Brazilian data generators
const FIRST_NAMES_MALE = [
  'João', 'Pedro', 'Lucas', 'Gabriel', 'Matheus', 'Rafael', 'Gustavo', 'Felipe',
  'Bruno', 'Leonardo', 'Rodrigo', 'Fernando', 'André', 'Carlos', 'Ricardo',
  'Marcelo', 'Paulo', 'Eduardo', 'Daniel', 'Thiago', 'Diego', 'Vinícius',
  'Henrique', 'Caio', 'Leandro', 'Fábio', 'Renato', 'Guilherme', 'Alex', 'Igor',
];

const FIRST_NAMES_FEMALE = [
  'Maria', 'Ana', 'Juliana', 'Fernanda', 'Camila', 'Amanda', 'Bruna', 'Larissa',
  'Carolina', 'Mariana', 'Patricia', 'Beatriz', 'Gabriela', 'Letícia', 'Vanessa',
  'Raquel', 'Natália', 'Renata', 'Tatiana', 'Aline', 'Priscila', 'Carla',
  'Cristiane', 'Daniela', 'Elaine', 'Flávia', 'Helena', 'Isabella', 'Jéssica', 'Karen',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos',
  'Gonçalves', 'Santana', 'Teixeira', 'Correia', 'Araújo', 'Pinto', 'Monteiro', 'Campos',
];

const STREET_TYPES = ['Rua', 'Avenida', 'Alameda', 'Travessa', 'Praça'];

const STREET_NAMES = [
  'das Flores', 'Brasil', 'São Paulo', 'XV de Novembro', 'Paulista', 'Copacabana',
  'Ipiranga', 'Independência', 'da Liberdade', 'dos Bandeirantes', 'Rio Branco',
  'Afonso Pena', 'Santos Dumont', 'Tiradentes', 'Sete de Setembro', 'Getúlio Vargas',
  'JK', 'das Américas', 'Atlântica', 'Beira Mar', 'do Contorno', 'Principal',
];

const NEIGHBORHOODS = [
  'Centro', 'Jardim Paulista', 'Copacabana', 'Ipanema', 'Bela Vista', 'Pinheiros',
  'Moema', 'Vila Mariana', 'Savassi', 'Barra da Tijuca', 'Leblon', 'Botafogo',
  'Lapa', 'Santa Felicidade', 'Boa Viagem', 'Aldeota', 'Moinhos de Vento',
  'Cidade Baixa', 'Funcionários', 'Água Verde', 'Centro Histórico', 'Asa Sul',
];

const CITIES: { name: string; state: string; cepPrefix: string }[] = [
  { name: 'São Paulo', state: 'SP', cepPrefix: '01' },
  { name: 'Rio de Janeiro', state: 'RJ', cepPrefix: '20' },
  { name: 'Belo Horizonte', state: 'MG', cepPrefix: '30' },
  { name: 'Porto Alegre', state: 'RS', cepPrefix: '90' },
  { name: 'Curitiba', state: 'PR', cepPrefix: '80' },
  { name: 'Salvador', state: 'BA', cepPrefix: '40' },
  { name: 'Brasília', state: 'DF', cepPrefix: '70' },
  { name: 'Fortaleza', state: 'CE', cepPrefix: '60' },
  { name: 'Recife', state: 'PE', cepPrefix: '50' },
  { name: 'Manaus', state: 'AM', cepPrefix: '69' },
  { name: 'Goiânia', state: 'GO', cepPrefix: '74' },
  { name: 'Campinas', state: 'SP', cepPrefix: '13' },
  { name: 'Florianópolis', state: 'SC', cepPrefix: '88' },
  { name: 'Vitória', state: 'ES', cepPrefix: '29' },
  { name: 'Natal', state: 'RN', cepPrefix: '59' },
];

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_METHODS = ['pix', 'credit_card', 'boleto', 'debit_card'];
const SHIPPING_CARRIERS = ['Correios', 'Jadlog', 'Total Express', 'Loggi', 'Azul Cargo'];
const SHIPPING_METHODS = ['PAC', 'SEDEX', 'Expressa', 'Econômica'];
const ORDER_SOURCES = ['web', 'mobile', 'marketplace', 'admin'];

const REVIEW_TITLES_POSITIVE = [
  'Excelente produto!', 'Superou minhas expectativas', 'Recomendo muito!',
  'Ótima qualidade', 'Chegou antes do prazo', 'Perfeito!', 'Adorei!',
  'Muito bom', 'Vale cada centavo', 'Compra certeira',
];

const REVIEW_TITLES_NEGATIVE = [
  'Não recomendo', 'Poderia ser melhor', 'Decepcionante',
  'Produto com defeito', 'Demorou muito para chegar', 'Qualidade inferior',
];

const REVIEW_COMMENTS = [
  'Produto de excelente qualidade, como descrito no anúncio.',
  'Chegou bem embalado e dentro do prazo. Muito satisfeito!',
  'Uso diariamente e estou muito satisfeito com a compra.',
  'Custo-benefício excelente. Recomendo a todos.',
  'Atendeu perfeitamente às minhas expectativas.',
  'A entrega foi rápida e o produto veio em perfeito estado.',
  'Já é minha segunda compra. Qualidade impecável.',
  'O produto é bom, mas demorou um pouco para chegar.',
  'Funciona bem, mas esperava uma qualidade um pouco melhor.',
  'Produto OK, nada excepcional mas cumpre o que promete.',
];

// Utility functions
function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateCPF(): string {
  const n = () => random(0, 9);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

function generatePhone(ddd: string): string {
  const n = () => random(0, 9);
  return `(${ddd}) 9${n()}${n()}${n()}${n()}-${n()}${n()}${n()}${n()}`;
}

function generateCEP(prefix: string): string {
  const n = () => random(0, 9);
  return `${prefix}${n()}${n()}${n()}-${n()}${n()}${n()}`;
}

function generateOrderNumber(index: number): string {
  const year = 2024;
  return `ORD-${year}-${String(index).padStart(6, '0')}`;
}

function formatDate(date: Date): string {
  return date.toISOString();
}

// Data generators
function generateCustomer(index: number) {
  const isFemale = Math.random() > 0.5;
  const firstName = randomElement(isFemale ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE);
  const lastName = randomElement(LAST_NAMES);
  const city = randomElement(CITIES);

  const birthYear = random(1960, 2005);
  const birthDate = new Date(birthYear, random(0, 11), random(1, 28));

  const createdAt = randomDate(new Date('2022-01-01'), new Date('2024-01-15'));

  return {
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@email.com`,
    cpf: generateCPF(),
    first_name: firstName,
    last_name: lastName,
    phone: generatePhone(city.cepPrefix.substring(0, 2) || '11'),
    birth_date: birthDate.toISOString().split('T')[0],
    gender: isFemale ? 'Feminino' : 'Masculino',
    is_active: Math.random() > 0.05,
    is_verified: Math.random() > 0.3,
    marketing_consent: Math.random() > 0.4,
    created_at: formatDate(createdAt),
  };
}

function generateAddress(customerId: number, index: number) {
  const city = randomElement(CITIES);
  const labels = ['Casa', 'Trabalho', 'Outro'];

  return {
    customer_id: customerId,
    label: labels[index] || 'Outro',
    recipient_name: null, // Will be filled from customer
    street: `${randomElement(STREET_TYPES)} ${randomElement(STREET_NAMES)}`,
    number: String(random(1, 2000)),
    complement: Math.random() > 0.5 ? `Apto ${random(1, 500)}` : null,
    neighborhood: randomElement(NEIGHBORHOODS),
    city: city.name,
    state: city.state,
    postal_code: generateCEP(city.cepPrefix),
    is_default: index === 0,
    is_billing: index === 0,
  };
}

function generateOrder(
  customerId: number,
  orderIndex: number,
  customerCreatedAt: Date,
  products: { id: number; sku: string; name: string; price: number }[]
) {
  const orderDate = randomDate(
    new Date(Math.max(customerCreatedAt.getTime(), new Date('2023-01-01').getTime())),
    new Date('2024-12-31')
  );

  const status = randomElement(ORDER_STATUSES);
  const paymentMethod = randomElement(PAYMENT_METHODS);
  const city = randomElement(CITIES);

  // Generate order items
  const numItems = random(CONFIG.itemsPerOrder.min, CONFIG.itemsPerOrder.max);
  const selectedProducts: typeof products = [];
  for (let i = 0; i < numItems; i++) {
    const product = randomElement(products);
    if (!selectedProducts.find((p) => p.id === product.id)) {
      selectedProducts.push(product);
    }
  }

  const items = selectedProducts.map((product) => {
    const quantity = random(1, 3);
    const discount = Math.random() > 0.7 ? product.price * 0.1 * quantity : 0;
    return {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      quantity,
      unit_price: product.price,
      discount: Math.round(discount * 100) / 100,
      subtotal: Math.round((product.price * quantity - discount) * 100) / 100,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
  const shippingTotal = subtotal > 200 ? 0 : random(15, 50);
  const total = Math.round((subtotal + shippingTotal) * 100) / 100;

  let shippedAt = null;
  let deliveredAt = null;
  let paidAt = null;
  let cancelledAt = null;

  if (status === 'cancelled') {
    cancelledAt = new Date(orderDate.getTime() + random(1, 3) * 24 * 60 * 60 * 1000);
  } else if (['confirmed', 'processing', 'shipped', 'delivered'].includes(status)) {
    paidAt = new Date(orderDate.getTime() + random(0, 2) * 60 * 60 * 1000);
  }

  if (['shipped', 'delivered'].includes(status)) {
    shippedAt = new Date(orderDate.getTime() + random(1, 5) * 24 * 60 * 60 * 1000);
  }

  if (status === 'delivered') {
    deliveredAt = new Date(shippedAt!.getTime() + random(2, 10) * 24 * 60 * 60 * 1000);
  }

  return {
    order: {
      order_number: generateOrderNumber(orderIndex),
      customer_id: customerId,
      status,
      payment_status: status === 'cancelled' ? 'failed' : paidAt ? 'paid' : 'pending',
      fulfillment_status:
        status === 'delivered' ? 'fulfilled' : status === 'shipped' ? 'partially_fulfilled' : 'unfulfilled',
      subtotal: Math.round(subtotal * 100) / 100,
      discount_total: Math.round(discountTotal * 100) / 100,
      shipping_total: shippingTotal,
      tax_total: 0,
      total,
      shipping_city: city.name,
      shipping_state: city.state,
      shipping_postal_code: generateCEP(city.cepPrefix),
      shipping_method: randomElement(SHIPPING_METHODS),
      shipping_carrier: randomElement(SHIPPING_CARRIERS),
      tracking_number: shippedAt ? `BR${random(100000000, 999999999)}BR` : null,
      shipped_at: shippedAt ? formatDate(shippedAt) : null,
      delivered_at: deliveredAt ? formatDate(deliveredAt) : null,
      payment_method: paymentMethod,
      paid_at: paidAt ? formatDate(paidAt) : null,
      cancelled_at: cancelledAt ? formatDate(cancelledAt) : null,
      source: randomElement(ORDER_SOURCES),
      created_at: formatDate(orderDate),
    },
    items,
    shouldReview: status === 'delivered' && Math.random() < CONFIG.reviewPercentage,
  };
}

function generateReview(
  productId: number,
  customerId: number,
  orderId: number,
  orderDeliveredAt: Date
) {
  const rating = random(1, 5);
  const isPositive = rating >= 4;

  const reviewDate = new Date(
    orderDeliveredAt.getTime() + random(1, 30) * 24 * 60 * 60 * 1000
  );

  return {
    product_id: productId,
    customer_id: customerId,
    order_id: orderId,
    rating,
    title: randomElement(isPositive ? REVIEW_TITLES_POSITIVE : REVIEW_TITLES_NEGATIVE),
    content: randomElement(REVIEW_COMMENTS),
    is_verified_purchase: true,
    is_approved: Math.random() > 0.1,
    is_featured: rating === 5 && Math.random() > 0.8,
    helpful_count: random(0, 50),
    created_at: formatDate(reviewDate),
  };
}

function generateInventoryMovement(
  productId: number,
  currentQuantity: number,
  movementIndex: number
) {
  const types = ['purchase', 'sale', 'return', 'adjustment', 'damage'];
  const weights = [0.3, 0.4, 0.1, 0.15, 0.05];

  let type: string;
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      type = types[i];
      break;
    }
  }
  type = type! || 'sale';

  let quantity: number;
  if (type === 'purchase') {
    quantity = random(10, 100);
  } else if (type === 'sale') {
    quantity = -random(1, 5);
  } else if (type === 'return') {
    quantity = random(1, 3);
  } else if (type === 'damage') {
    quantity = -random(1, 3);
  } else {
    quantity = random(-10, 10);
  }

  const previousQuantity = currentQuantity;
  const newQuantity = Math.max(0, currentQuantity + quantity);

  const movementDate = randomDate(new Date('2023-01-01'), new Date('2024-12-31'));

  return {
    movement: {
      product_id: productId,
      movement_type: type,
      quantity,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      notes: type === 'adjustment' ? 'Ajuste de inventário' : null,
      performed_by: 'Sistema',
      created_at: formatDate(movementDate),
    },
    newQuantity,
  };
}

// Main seeding function
async function seed() {
  const connectionString =
    process.env.ECOMMERCE_DATABASE_URL ||
    'postgresql://ecommerce:ecommerce123@localhost:5433/ecommerce_demo';

  const pool = new Pool({ connectionString });

  try {
    console.log('Connecting to database...');
    await pool.query('SELECT 1');
    console.log('Connected successfully!');

    // Get existing products
    console.log('Fetching existing products...');
    const productsResult = await pool.query<{
      id: number;
      sku: string;
      name: string;
      price: number;
    }>('SELECT id, sku, name, price FROM products');
    const products = productsResult.rows;
    console.log(`Found ${products.length} products`);

    if (products.length === 0) {
      console.error('No products found. Please run the schema and seed SQL first.');
      process.exit(1);
    }

    // Generate customers
    console.log(`Generating ${CONFIG.customers} customers...`);
    const customers: { id: number; created_at: Date }[] = [];

    for (let i = 0; i < CONFIG.customers; i++) {
      const customer = generateCustomer(i + 10); // Start at 10 to avoid conflicts with seed data

      try {
        const result = await pool.query(
          `INSERT INTO customers (email, cpf, first_name, last_name, phone, birth_date, gender, is_active, is_verified, marketing_consent, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            customer.email,
            customer.cpf,
            customer.first_name,
            customer.last_name,
            customer.phone,
            customer.birth_date,
            customer.gender,
            customer.is_active,
            customer.is_verified,
            customer.marketing_consent,
            customer.created_at,
          ]
        );

        customers.push({
          id: result.rows[0].id,
          created_at: new Date(customer.created_at),
        });

        if ((i + 1) % 100 === 0) {
          console.log(`  Created ${i + 1} customers...`);
        }
      } catch (err) {
        // Skip duplicates
        continue;
      }
    }
    console.log(`Created ${customers.length} customers`);

    // Generate addresses
    console.log('Generating addresses...');
    let addressCount = 0;
    for (const customer of customers) {
      const numAddresses = random(CONFIG.addressesPerCustomer.min, CONFIG.addressesPerCustomer.max);

      for (let i = 0; i < numAddresses; i++) {
        const address = generateAddress(customer.id, i);

        await pool.query(
          `INSERT INTO addresses (customer_id, label, street, number, complement, neighborhood, city, state, postal_code, is_default, is_billing)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            address.customer_id,
            address.label,
            address.street,
            address.number,
            address.complement,
            address.neighborhood,
            address.city,
            address.state,
            address.postal_code,
            address.is_default,
            address.is_billing,
          ]
        );
        addressCount++;
      }
    }
    console.log(`Created ${addressCount} addresses`);

    // Generate orders
    console.log('Generating orders...');
    let orderIndex = 100; // Start at 100 to avoid conflicts
    let orderCount = 0;
    let itemCount = 0;
    const reviewsToCreate: ReturnType<typeof generateReview>[] = [];

    for (const customer of customers) {
      const numOrders = random(CONFIG.ordersPerCustomer.min, CONFIG.ordersPerCustomer.max);

      for (let i = 0; i < numOrders; i++) {
        const orderData = generateOrder(customer.id, orderIndex++, customer.created_at, products);

        const orderResult = await pool.query(
          `INSERT INTO orders (order_number, customer_id, status, payment_status, fulfillment_status,
            subtotal, discount_total, shipping_total, tax_total, total,
            shipping_city, shipping_state, shipping_postal_code,
            shipping_method, shipping_carrier, tracking_number,
            shipped_at, delivered_at, payment_method, paid_at, cancelled_at, source, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
           RETURNING id`,
          [
            orderData.order.order_number,
            orderData.order.customer_id,
            orderData.order.status,
            orderData.order.payment_status,
            orderData.order.fulfillment_status,
            orderData.order.subtotal,
            orderData.order.discount_total,
            orderData.order.shipping_total,
            orderData.order.tax_total,
            orderData.order.total,
            orderData.order.shipping_city,
            orderData.order.shipping_state,
            orderData.order.shipping_postal_code,
            orderData.order.shipping_method,
            orderData.order.shipping_carrier,
            orderData.order.tracking_number,
            orderData.order.shipped_at,
            orderData.order.delivered_at,
            orderData.order.payment_method,
            orderData.order.paid_at,
            orderData.order.cancelled_at,
            orderData.order.source,
            orderData.order.created_at,
          ]
        );

        const orderId = orderResult.rows[0].id;
        orderCount++;

        // Insert order items
        for (const item of orderData.items) {
          await pool.query(
            `INSERT INTO order_items (order_id, product_id, sku, name, quantity, unit_price, discount, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              orderId,
              item.product_id,
              item.sku,
              item.name,
              item.quantity,
              item.unit_price,
              item.discount,
              item.subtotal,
            ]
          );
          itemCount++;
        }

        // Queue reviews for delivered orders
        if (orderData.shouldReview && orderData.order.delivered_at) {
          const productToReview = randomElement(orderData.items);
          reviewsToCreate.push(
            generateReview(
              productToReview.product_id,
              customer.id,
              orderId,
              new Date(orderData.order.delivered_at)
            )
          );
        }
      }

      if (customers.indexOf(customer) % 100 === 0 && customers.indexOf(customer) > 0) {
        console.log(`  Processed ${customers.indexOf(customer)} customers, ${orderCount} orders...`);
      }
    }
    console.log(`Created ${orderCount} orders with ${itemCount} items`);

    // Update customer stats
    console.log('Updating customer statistics...');
    await pool.query(`
      UPDATE customers c SET
        total_orders = (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status != 'cancelled'),
        total_spent = COALESCE((SELECT SUM(total) FROM orders o WHERE o.customer_id = c.id AND o.payment_status = 'paid'), 0),
        last_order_at = (SELECT MAX(created_at) FROM orders o WHERE o.customer_id = c.id)
    `);

    // Insert reviews
    console.log(`Creating ${reviewsToCreate.length} reviews...`);
    for (const review of reviewsToCreate) {
      await pool.query(
        `INSERT INTO reviews (product_id, customer_id, order_id, rating, title, content, is_verified_purchase, is_approved, is_featured, helpful_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          review.product_id,
          review.customer_id,
          review.order_id,
          review.rating,
          review.title,
          review.content,
          review.is_verified_purchase,
          review.is_approved,
          review.is_featured,
          review.helpful_count,
          review.created_at,
        ]
      );
    }
    console.log(`Created ${reviewsToCreate.length} reviews`);

    // Generate inventory movements
    console.log('Generating inventory movements...');
    let movementCount = 0;

    for (const product of products) {
      const numMovements = random(
        CONFIG.inventoryMovementsPerProduct.min,
        CONFIG.inventoryMovementsPerProduct.max
      );
      let currentQuantity = random(50, 200);

      for (let i = 0; i < numMovements; i++) {
        const { movement, newQuantity } = generateInventoryMovement(
          product.id,
          currentQuantity,
          i
        );

        await pool.query(
          `INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, notes, performed_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            movement.product_id,
            movement.movement_type,
            movement.quantity,
            movement.previous_quantity,
            movement.new_quantity,
            movement.notes,
            movement.performed_by,
            movement.created_at,
          ]
        );

        currentQuantity = newQuantity;
        movementCount++;
      }
    }
    console.log(`Created ${movementCount} inventory movements`);

    // Print summary
    console.log('\n========================================');
    console.log('Seeding completed successfully!');
    console.log('========================================');
    console.log(`Customers: ${customers.length}`);
    console.log(`Addresses: ${addressCount}`);
    console.log(`Orders: ${orderCount}`);
    console.log(`Order Items: ${itemCount}`);
    console.log(`Reviews: ${reviewsToCreate.length}`);
    console.log(`Inventory Movements: ${movementCount}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seed
seed();
