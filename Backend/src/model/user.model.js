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
   
  //user refresh token
  await pool.query(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,

    -- Store a HASH of the token, never the raw token
    token_hash    VARCHAR(255) NOT NULL,

    -- Device/session context (optional but useful)
    user_agent    VARCHAR(255),
    ip_address    VARCHAR(45),

    -- Rotation & revocation
    is_revoked    BOOLEAN DEFAULT false,
    replaced_by   INT DEFAULT NULL,  -- points to the new token id after rotation

    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (replaced_by) REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    INDEX idx_refresh_user (user_id),
    INDEX idx_refresh_token_hash (token_hash)
  )`)

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