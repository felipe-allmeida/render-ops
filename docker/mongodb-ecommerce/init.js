// MongoDB Ecommerce Demo Initialization
// This script runs on container startup

// Switch to ecommerce database
db = db.getSiblingDB('ecommerce_demo');

// Create application user
db.createUser({
  user: 'ecommerce',
  pwd: 'ecommerce123',
  roles: [
    { role: 'readWrite', db: 'ecommerce_demo' }
  ]
});

// Create collections (no validators for flexibility with seed data)
db.createCollection('categories');
db.createCollection('products');
db.createCollection('customers');
db.createCollection('orders');
db.createCollection('reviews');
db.createCollection('inventoryLog');

// Create indexes for better query performance
db.categories.createIndex({ name: 1 });
db.categories.createIndex({ parentId: 1 });

db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ categoryId: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ name: 'text', description: 'text' });

db.customers.createIndex({ email: 1 }, { unique: true });
db.customers.createIndex({ lastName: 1, firstName: 1 });

db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ customerId: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });

db.reviews.createIndex({ productId: 1 });
db.reviews.createIndex({ customerId: 1 });
db.reviews.createIndex({ rating: 1 });

db.inventoryLog.createIndex({ productId: 1 });
db.inventoryLog.createIndex({ createdAt: -1 });

print('MongoDB ecommerce_demo initialized successfully!');
