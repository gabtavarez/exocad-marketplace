CREATE TABLE order_messages (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_messages_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id)
);

CREATE INDEX idx_order_messages_order_id_created_at ON order_messages (order_id, created_at);
CREATE INDEX idx_order_messages_sender_id ON order_messages (sender_id);
