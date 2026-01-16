-- Seed data for demo tables (customers and orders)
-- These tables are for testing the CRUD UI generator

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Brazil',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    order_date DATE DEFAULT CURRENT_DATE,
    shipped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    category VARCHAR(100),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- Insert sample customers
INSERT INTO customers (name, email, phone, address, city, country, is_active) VALUES
    ('Maria Silva', 'maria@example.com', '+55 11 99999-1111', 'Rua das Flores, 123', 'Sao Paulo', 'Brazil', true),
    ('Joao Santos', 'joao@example.com', '+55 21 99999-2222', 'Av. Brasil, 456', 'Rio de Janeiro', 'Brazil', true),
    ('Ana Oliveira', 'ana@example.com', '+55 31 99999-3333', 'Rua Minas, 789', 'Belo Horizonte', 'Brazil', true),
    ('Pedro Costa', 'pedro@example.com', '+55 41 99999-4444', 'Rua Parana, 321', 'Curitiba', 'Brazil', false),
    ('Lucia Ferreira', 'lucia@example.com', '+55 51 99999-5555', 'Av. Gaucha, 654', 'Porto Alegre', 'Brazil', true);

-- Insert sample products
INSERT INTO products (name, description, sku, price, stock_quantity, category, is_available) VALUES
    ('Notebook Pro 15', 'High-performance laptop with 16GB RAM', 'NB-PRO-15', 4999.99, 50, 'Electronics', true),
    ('Wireless Mouse', 'Ergonomic wireless mouse', 'MS-WL-001', 149.99, 200, 'Accessories', true),
    ('USB-C Hub', '7-port USB-C hub with HDMI', 'HUB-7P-C', 299.99, 100, 'Accessories', true),
    ('Monitor 27"', '4K IPS monitor', 'MON-27-4K', 2499.99, 30, 'Electronics', true),
    ('Mechanical Keyboard', 'RGB mechanical keyboard', 'KB-MEC-RGB', 449.99, 75, 'Accessories', false);

-- Insert sample orders
INSERT INTO orders (customer_id, order_number, status, total_amount, notes, order_date) VALUES
    (1, 'ORD-2024-001', 'completed', 5149.98, 'Gift wrapping requested', '2024-01-15'),
    (2, 'ORD-2024-002', 'shipped', 2499.99, NULL, '2024-01-16'),
    (3, 'ORD-2024-003', 'pending', 749.98, 'Express delivery', '2024-01-17'),
    (1, 'ORD-2024-004', 'processing', 4999.99, NULL, '2024-01-18'),
    (4, 'ORD-2024-005', 'cancelled', 299.99, 'Customer requested cancellation', '2024-01-19');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
    (1, 1, 1, 4999.99, 4999.99),
    (1, 2, 1, 149.99, 149.99),
    (2, 4, 1, 2499.99, 2499.99),
    (3, 2, 2, 149.99, 299.98),
    (3, 5, 1, 449.99, 449.99),
    (4, 1, 1, 4999.99, 4999.99),
    (5, 3, 1, 299.99, 299.99);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
