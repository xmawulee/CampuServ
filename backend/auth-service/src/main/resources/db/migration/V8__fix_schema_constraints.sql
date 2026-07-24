-- Drop the foreign key constraint on transactions.job_id so that
-- deposit transactions can use synthetic IDs like 'deposit-userId'
-- that don't reference a real jobs row.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_job_id_fkey;

-- Allow chat_messages.receiver_id to be NULL since the mobile client
-- sends messages via STOMP without specifying a receiver (it's implied
-- by the job's participants).
ALTER TABLE chat_messages ALTER COLUMN receiver_id DROP NOT NULL;
