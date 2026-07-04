-- Migration: 20260704_chat_webhook_received
-- Creates the chat_webhook_received table for webhook diagnostics
-- This table was referenced but did not exist, causing silent INSERT failures

BEGIN;

CREATE TABLE IF NOT EXISTS chat_webhook_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT,
  webhook_type TEXT, -- 'chat', 'message', 'connection', etc.
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  correlation_id TEXT, -- timestamp + random for end-to-end tracing
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Index for querying by correlation_id (used in webhook logging)
CREATE INDEX IF NOT EXISTS idx_chat_webhook_received_correlation_id
  ON chat_webhook_received(correlation_id);

-- Index for unprocessed webhooks (for retry logic if needed)
CREATE INDEX IF NOT EXISTS idx_chat_webhook_received_unprocessed
  ON chat_webhook_received(created_at DESC)
  WHERE processed = false;

-- Note: RLS disabled for this table as it's written by the Edge Function
-- service role and read-only for admins. Adjust if needed.

COMMIT;

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
