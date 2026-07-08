import pool from "../db/index.db.js";

export const createOrderTable = async () => {
  // Orders
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        user_id           INT NOT NULL,

        -- Shipping snapshot (copied from user_addresses at checkout)
        shipping_full_name   VARCHAR(100) NOT NULL,
        shipping_phone       VARCHAR(20) NOT NULL,
        shipping_street      VARCHAR(255) NOT NULL,
        shipping_city        VARCHAR(100) NOT NULL,
        shipping_state       VARCHAR(100),
        shipping_country     VARCHAR(100) NOT NULL,
        shipping_postal_code VARCHAR(20),

        status            ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
        payment_status    ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid',
        payment_method    ENUM('cod', 'stripe', 'paypal', 'jazzcash', 'easypaisa') NOT NULL,

        subtotal          DECIMAL(10, 2) NOT NULL,
        discount          DECIMAL(10, 2) DEFAULT 0.00,
        tax               DECIMAL(10, 2) DEFAULT 0.00,
        shipping_fee      DECIMAL(10, 2) DEFAULT 0.00,
        total_amount      DECIMAL(10, 2) NOT NULL,

        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_orders_user (user_id)
    )
  `);

  // Order items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        order_id    INT NOT NULL,
        product_id  INT NOT NULL,
        size_id     INT,
        quantity    INT NOT NULL,
        price       DECIMAL(10, 2) NOT NULL, -- snapshot price at time of order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL,
        UNIQUE (order_id, product_id, size_id),
        INDEX idx_order_items_order (order_id),
        INDEX idx_order_items_product (product_id)
    )
  `);
};