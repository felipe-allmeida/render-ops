-- E-commerce Demo Database Schema
-- Brazilian SaaS E-commerce for demonstration/marketing purposes

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- Categories (hierarchical structure)
-- ================================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);

-- ================================================
-- Products
-- ================================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(12, 2) NOT NULL,
    compare_at_price DECIMAL(12, 2),
    cost_price DECIMAL(12, 2),
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    weight_kg DECIMAL(8, 3),
    dimensions_cm VARCHAR(50), -- "LxWxH" format
    brand VARCHAR(100),
    barcode VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    requires_shipping BOOLEAN DEFAULT true,
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    tags TEXT[], -- PostgreSQL array
    images JSONB DEFAULT '[]',
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock ON products(stock_quantity);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- ================================================
-- Customers
-- ================================================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    cpf VARCHAR(14) UNIQUE, -- Brazilian CPF: 000.000.000-00
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20),
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(14, 2) DEFAULT 0,
    last_order_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_cpf ON customers(cpf);
CREATE INDEX idx_customers_active ON customers(is_active);
CREATE INDEX idx_customers_created ON customers(created_at);

-- ================================================
-- Addresses
-- ================================================
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'Principal', -- "Casa", "Trabalho", etc.
    recipient_name VARCHAR(200),
    street VARCHAR(255) NOT NULL,
    number VARCHAR(20) NOT NULL,
    complement VARCHAR(100),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL, -- UF: SP, RJ, MG, etc.
    postal_code VARCHAR(10) NOT NULL, -- CEP: 00000-000
    country VARCHAR(50) DEFAULT 'Brasil',
    phone VARCHAR(20),
    is_default BOOLEAN DEFAULT false,
    is_billing BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_customer ON addresses(customer_id);
CREATE INDEX idx_addresses_postal_code ON addresses(postal_code);
CREATE INDEX idx_addresses_state ON addresses(state);
CREATE INDEX idx_addresses_city ON addresses(city);

-- ================================================
-- Coupons
-- ================================================
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed', 'free_shipping'
    discount_value DECIMAL(10, 2) NOT NULL,
    minimum_order_value DECIMAL(10, 2) DEFAULT 0,
    maximum_discount DECIMAL(10, 2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    usage_limit_per_customer INTEGER DEFAULT 1,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    applies_to_first_order_only BOOLEAN DEFAULT false,
    allowed_categories INTEGER[],
    allowed_products INTEGER[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid ON coupons(valid_from, valid_until);

-- ================================================
-- Orders
-- ================================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "ORD-2024-000001"
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- Status: pending, confirmed, processing, shipped, delivered, cancelled, refunded
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- Payment: pending, paid, failed, refunded, partially_refunded
    fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'unfulfilled',
    -- Fulfillment: unfulfilled, partially_fulfilled, fulfilled

    -- Pricing
    subtotal DECIMAL(12, 2) NOT NULL,
    discount_total DECIMAL(12, 2) DEFAULT 0,
    shipping_total DECIMAL(12, 2) DEFAULT 0,
    tax_total DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,

    -- Shipping Address (denormalized for historical accuracy)
    shipping_name VARCHAR(200),
    shipping_street VARCHAR(255),
    shipping_number VARCHAR(20),
    shipping_complement VARCHAR(100),
    shipping_neighborhood VARCHAR(100),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(2),
    shipping_postal_code VARCHAR(10),
    shipping_country VARCHAR(50) DEFAULT 'Brasil',
    shipping_phone VARCHAR(20),

    -- Billing Address
    billing_name VARCHAR(200),
    billing_street VARCHAR(255),
    billing_number VARCHAR(20),
    billing_complement VARCHAR(100),
    billing_neighborhood VARCHAR(100),
    billing_city VARCHAR(100),
    billing_state VARCHAR(2),
    billing_postal_code VARCHAR(10),
    billing_country VARCHAR(50) DEFAULT 'Brasil',
    billing_cpf VARCHAR(14),

    -- Shipping info
    shipping_method VARCHAR(100),
    shipping_carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    estimated_delivery DATE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- Payment info
    payment_method VARCHAR(50), -- 'pix', 'credit_card', 'boleto', 'debit_card'
    payment_gateway VARCHAR(50),
    payment_transaction_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,

    -- Coupon
    coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL,
    coupon_code VARCHAR(50),

    -- Other
    notes TEXT,
    internal_notes TEXT,
    source VARCHAR(50) DEFAULT 'web', -- 'web', 'mobile', 'marketplace', 'admin'
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',

    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_shipped ON orders(shipped_at);
CREATE INDEX idx_orders_delivered ON orders(delivered_at);

-- ================================================
-- Order Items
-- ================================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0,
    subtotal DECIMAL(12, 2) NOT NULL,
    weight_kg DECIMAL(8, 3),
    attributes JSONB DEFAULT '{}', -- Selected options like size, color
    fulfilled_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_sku ON order_items(sku);

-- ================================================
-- Reviews
-- ================================================
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    pros TEXT,
    cons TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    images JSONB DEFAULT '[]',
    admin_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_approved ON reviews(is_approved);
CREATE INDEX idx_reviews_verified ON reviews(is_verified_purchase);

-- ================================================
-- Inventory Movements
-- ================================================
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(30) NOT NULL,
    -- Types: purchase, sale, return, adjustment, transfer, damage, expired
    quantity INTEGER NOT NULL, -- Positive for additions, negative for deductions
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2),
    reference_type VARCHAR(30), -- 'order', 'purchase_order', 'adjustment', etc.
    reference_id INTEGER,
    notes TEXT,
    performed_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_created ON inventory_movements(created_at);
CREATE INDEX idx_inventory_reference ON inventory_movements(reference_type, reference_id);

-- ================================================
-- Views for Analytics
-- ================================================

-- Customer overview with stats
CREATE VIEW customer_overview AS
SELECT
    c.id,
    c.email,
    c.first_name || ' ' || c.last_name AS full_name,
    c.cpf,
    c.phone,
    c.is_active,
    c.is_verified,
    c.total_orders,
    c.total_spent,
    c.last_order_at,
    c.created_at,
    (SELECT COUNT(*) FROM addresses a WHERE a.customer_id = c.id) AS address_count
FROM customers c;

-- Product overview with category
CREATE VIEW product_overview AS
SELECT
    p.id,
    p.sku,
    p.name,
    p.price,
    p.compare_at_price,
    p.stock_quantity,
    p.is_active,
    p.is_featured,
    p.brand,
    cat.name AS category_name,
    COALESCE(AVG(r.rating), 0) AS avg_rating,
    COUNT(DISTINCT r.id) AS review_count,
    p.created_at
FROM products p
LEFT JOIN categories cat ON p.category_id = cat.id
LEFT JOIN reviews r ON r.product_id = p.id AND r.is_approved = true
GROUP BY p.id, cat.name;

-- Order summary view
CREATE VIEW order_summary AS
SELECT
    o.id,
    o.order_number,
    o.status,
    o.payment_status,
    o.fulfillment_status,
    o.total,
    o.shipping_city,
    o.shipping_state,
    o.payment_method,
    o.coupon_code,
    o.created_at,
    o.shipped_at,
    o.delivered_at,
    c.email AS customer_email,
    c.first_name || ' ' || c.last_name AS customer_name,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id;

-- Daily sales summary
CREATE VIEW daily_sales AS
SELECT
    DATE(created_at) AS sale_date,
    COUNT(*) AS order_count,
    SUM(total) AS total_revenue,
    SUM(subtotal) AS subtotal,
    SUM(discount_total) AS total_discounts,
    SUM(shipping_total) AS total_shipping,
    AVG(total) AS avg_order_value
FROM orders
WHERE status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- ================================================
-- Triggers for updated_at
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
