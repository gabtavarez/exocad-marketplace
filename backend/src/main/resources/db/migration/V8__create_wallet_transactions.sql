CREATE TABLE wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    type VARCHAR(32) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_transactions_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_wallet_transactions_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_wallet_transactions_order_type UNIQUE (order_id, type),
    CONSTRAINT chk_wallet_transactions_type CHECK (
        type IN ('ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'PLATFORM_FEE')
    ),
    CONSTRAINT chk_wallet_transactions_status CHECK (status = 'COMPLETED'),
    CONSTRAINT chk_wallet_transactions_amount CHECK (amount >= 0)
);

CREATE INDEX idx_wallet_transactions_user_created_at
    ON wallet_transactions (user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_order_id
    ON wallet_transactions (order_id);
