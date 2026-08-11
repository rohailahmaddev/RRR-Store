import pool from "../config/index.db.js"

export const createLogTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        user_id       INT,                          -- who performed the action (nullable — system actions have no user)
        action        VARCHAR(100) NOT NULL,         -- e.g. 'USER_DEACTIVATED', 'ORDER_CANCELLED', 'PRODUCT_DELETED'
        entity_type   VARCHAR(50) NOT NULL,          -- e.g. 'user', 'order', 'product'
        entity_id     INT NOT NULL,                  -- id of the affected row
        details       JSON,                          -- flexible extra context (old value, new value, reason, etc.)
        ip_address    VARCHAR(45),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_audit_entity (entity_type, entity_id),
        INDEX idx_audit_user (user_id),
        INDEX idx_audit_created (created_at)
    )
    `)
}