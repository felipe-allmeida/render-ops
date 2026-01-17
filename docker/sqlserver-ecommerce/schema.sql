-- SQL Server Ecommerce Demo Schema
-- Run this after container starts: sqlcmd -S localhost -U sa -P "EcommercePass123!" -i schema.sql

-- Create database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ecommerce_demo')
BEGIN
    CREATE DATABASE ecommerce_demo;
END
GO

USE ecommerce_demo;
GO

-- Categories
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'categories')
BEGIN
    CREATE TABLE categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(MAX),
        parent_id INT NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (parent_id) REFERENCES categories(id)
    );
END
GO

-- Products
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'products')
BEGIN
    CREATE TABLE products (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sku NVARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        price DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(10, 2),
        stock_quantity INT DEFAULT 0,
        category_id INT,
        is_active BIT DEFAULT 1,
        weight DECIMAL(8, 2),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE INDEX idx_products_category ON products(category_id);
    CREATE INDEX idx_products_price ON products(price);
END
GO

-- Customers
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customers')
BEGIN
    CREATE TABLE customers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL UNIQUE,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        phone NVARCHAR(20),
        date_of_birth DATE,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE()
    );
    CREATE INDEX idx_customers_email ON customers(email);
    CREATE INDEX idx_customers_name ON customers(last_name, first_name);
END
GO

-- Addresses
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'addresses')
BEGIN
    CREATE TABLE addresses (
        id INT IDENTITY(1,1) PRIMARY KEY,
        customer_id INT NOT NULL,
        address_type NVARCHAR(20) DEFAULT 'shipping' CHECK (address_type IN ('billing', 'shipping')),
        street_address NVARCHAR(255) NOT NULL,
        city NVARCHAR(100) NOT NULL,
        state NVARCHAR(100),
        postal_code NVARCHAR(20) NOT NULL,
        country NVARCHAR(100) NOT NULL DEFAULT 'USA',
        is_default BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_addresses_customer ON addresses(customer_id);
END
GO

-- Orders
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orders')
BEGIN
    CREATE TABLE orders (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_number NVARCHAR(50) NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
        subtotal DECIMAL(12, 2) NOT NULL,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        shipping_amount DECIMAL(10, 2) DEFAULT 0,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(12, 2) NOT NULL,
        shipping_address_id INT,
        billing_address_id INT,
        notes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (shipping_address_id) REFERENCES addresses(id),
        FOREIGN KEY (billing_address_id) REFERENCES addresses(id)
    );
    CREATE INDEX idx_orders_customer ON orders(customer_id);
    CREATE INDEX idx_orders_status ON orders(status);
    CREATE INDEX idx_orders_created ON orders(created_at);
END
GO

-- Order Items
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'order_items')
BEGIN
    CREATE TABLE order_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(12, 2) NOT NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE INDEX idx_order_items_order ON order_items(order_id);
    CREATE INDEX idx_order_items_product ON order_items(product_id);
END
GO

-- Reviews
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'reviews')
BEGIN
    CREATE TABLE reviews (
        id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL,
        customer_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title NVARCHAR(255),
        comment NVARCHAR(MAX),
        is_verified_purchase BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_reviews_product ON reviews(product_id);
    CREATE INDEX idx_reviews_customer ON reviews(customer_id);
    CREATE INDEX idx_reviews_rating ON reviews(rating);
END
GO

-- Inventory Log
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'inventory_log')
BEGIN
    CREATE TABLE inventory_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL,
        quantity_change INT NOT NULL,
        reason NVARCHAR(20) NOT NULL CHECK (reason IN ('purchase', 'restock', 'return', 'adjustment', 'damaged')),
        reference_id INT,
        notes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_inventory_log_product ON inventory_log(product_id);
    CREATE INDEX idx_inventory_log_created ON inventory_log(created_at);
END
GO

PRINT 'SQL Server ecommerce_demo schema created successfully!';
GO
