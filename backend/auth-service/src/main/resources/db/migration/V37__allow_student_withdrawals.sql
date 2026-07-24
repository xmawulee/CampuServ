ALTER TABLE student_wallet_transactions DROP CONSTRAINT student_wallet_transactions_type_check;

ALTER TABLE student_wallet_transactions ADD CONSTRAINT student_wallet_transactions_type_check CHECK (type IN ('DEPOSIT', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'WITHDRAWAL'));
