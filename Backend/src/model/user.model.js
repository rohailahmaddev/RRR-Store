import pool from "../db/index.db.js";

export const createUserTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id            INT AUTO_INCREMENT PRIMARY KEY,

        -- Basic Info
        full_name     VARCHAR(100) NOT NULL,
        email         VARCHAR(150) NOT NULL UNIQUE,
        password      VARCHAR(255) NOT NULL,
        phone         VARCHAR(20),
        avatar_url    VARCHAR(500),

        -- Role & Status
        role          ENUM('customer', 'admin') DEFAULT 'customer',
        is_verified   BOOLEAN DEFAULT false,
        is_active     BOOLEAN DEFAULT true,

        -- Email Verification & Password Reset
        verify_token        VARCHAR(255),
        verify_token_expiry DATETIME DEFAULT NULL,
        reset_token         VARCHAR(255),
        reset_token_expiry  DATETIME DEFAULT NULL,

        -- Timestamps
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
    )
  `);

  //user addresses
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_addresses (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        user_id       INT NOT NULL,
        label         VARCHAR(50),          -- "Home", "Office"
        full_name     VARCHAR(100) NOT NULL,
        street        VARCHAR(255) NOT NULL,
        city          VARCHAR(100) NOT NULL,
        state         VARCHAR(100),
        country       VARCHAR(100) NOT NULL,
        postal_code   VARCHAR(20),
        is_default    BOOLEAN DEFAULT false,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_addresses_user (user_id)
    )
  `);
};