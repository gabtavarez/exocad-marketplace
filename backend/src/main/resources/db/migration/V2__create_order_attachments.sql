CREATE TABLE order_attachments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    attachment_stage VARCHAR(32) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_attachments_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT chk_order_attachments_stage CHECK (attachment_stage IN ('CLINICAL_INPUT', 'CAD_DELIVERY')),
    CONSTRAINT chk_order_attachments_file_size CHECK (file_size > 0)
);

CREATE INDEX idx_order_attachments_order_id ON order_attachments (order_id);
