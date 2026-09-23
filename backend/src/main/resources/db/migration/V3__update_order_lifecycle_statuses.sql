ALTER TABLE orders
    ADD COLUMN revision_feedback TEXT;

UPDATE orders
SET status = 'IN_REVIEW'
WHERE status = 'REVIEW';

ALTER TABLE orders
    DROP CONSTRAINT chk_orders_status;

ALTER TABLE orders
    ADD CONSTRAINT chk_orders_status CHECK (
        status IN ('DRAFT', 'OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'REVISION_REQUESTED')
    );
