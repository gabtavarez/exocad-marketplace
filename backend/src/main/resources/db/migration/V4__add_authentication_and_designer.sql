ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255),
    ADD COLUMN google_id VARCHAR(255);

UPDATE users
SET role = 'DENTIST'
WHERE role IN ('ADMIN', 'CUSTOMER');

ALTER TABLE users
    DROP CONSTRAINT chk_users_role;

ALTER TABLE users
    ADD CONSTRAINT chk_users_role CHECK (role IN ('DENTIST', 'DESIGNER')),
    ADD CONSTRAINT uk_users_google_id UNIQUE (google_id);

ALTER TABLE orders
    ADD COLUMN designer_id BIGINT,
    ADD CONSTRAINT fk_orders_designer FOREIGN KEY (designer_id) REFERENCES users (id);

CREATE INDEX idx_orders_designer_id ON orders (designer_id);
