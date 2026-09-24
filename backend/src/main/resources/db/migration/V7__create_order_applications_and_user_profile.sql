ALTER TABLE users
    ADD COLUMN avatar_url VARCHAR(2048);

CREATE TABLE order_applications (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    designer_id BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_applications_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_applications_designer FOREIGN KEY (designer_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_order_applications_order_designer UNIQUE (order_id, designer_id),
    CONSTRAINT chk_order_applications_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'))
);

CREATE INDEX idx_order_applications_order_id ON order_applications (order_id);
CREATE INDEX idx_order_applications_designer_id ON order_applications (designer_id);
