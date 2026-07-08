import pool from "../db/index.db.js";

export const createCartTable = async () => {
  // Cart header — one per user
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL UNIQUE, -- one cart per user
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Cart items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        cart_id     INT NOT NULL,
        product_id  INT NOT NULL,
        size_id     INT,
        quantity    INT DEFAULT 1,
        FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL,
        UNIQUE (cart_id, product_id, size_id),
        INDEX idx_cart_items_cart (cart_id)
    )
  `);
};