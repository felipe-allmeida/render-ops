const { Pool } = require('pg');

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://ecommerce:ecommerce123@localhost:5433/ecommerce_demo'
  });

  try {
    const products = await pool.query('SELECT COUNT(*) as count FROM products');
    const customers = await pool.query('SELECT COUNT(*) as count FROM customers');
    const orders = await pool.query('SELECT COUNT(*) as count FROM orders');
    const reviews = await pool.query('SELECT COUNT(*) as count FROM reviews');

    console.log('=== E-commerce DB Status ===');
    console.log('Products:', products.rows[0].count);
    console.log('Customers:', customers.rows[0].count);
    console.log('Orders:', orders.rows[0].count);
    console.log('Reviews:', reviews.rows[0].count);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
