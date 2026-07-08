import pool from "../db/index.db.js";

export const createProductTable = async () => {
  // Categories
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(100) NOT NULL UNIQUE,
        slug        VARCHAR(120) NOT NULL UNIQUE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        sku           VARCHAR(50) UNIQUE,
        name          VARCHAR(255) NOT NULL,
        description   TEXT,
        price         DECIMAL(10, 2) NOT NULL,
        category_id   INT,
        rating        DECIMAL(2, 1) DEFAULT 0.0,
        rating_count  INT DEFAULT 0,
        is_active     BOOLEAN DEFAULT true,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        INDEX idx_products_category (category_id)
    )
  `);

  // Images
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_images (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        product_id  INT NOT NULL,
        image_url   VARCHAR(500) NOT NULL,
        is_primary  BOOLEAN DEFAULT false,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_images_product (product_id)
    )
  `);

  // Sizess
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_sizes (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        product_id  INT NOT NULL,
        size_name   VARCHAR(50) NOT NULL,
        stock       INT DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE (product_id, size_name),
        INDEX idx_sizes_product (product_id)
    )
  `);

  // Reviews
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        product_id  INT NOT NULL,
        user_id     INT NOT NULL,
        rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment     TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (product_id, user_id),
        INDEX idx_reviews_product (product_id)
    )
  `);
};