-- Migration: synthesis_requests — request-level idempotency table
--
-- Purpose: Prevent network-level duplicate delivery of synthesize-sense requests.
-- Each client-generated request_id can only trigger one synthesis.
-- Records expire after 10 minutes (covers the max synthesis duration ~3 min, plus buffer).
-- Cleanup is handled in the Edge Function (fire-and-forget DELETE on each invocation).

CREATE TABLE IF NOT EXISTS synthesis_requests (
    request_id  TEXT        PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    status      TEXT        NOT NULL DEFAULT 'processing', -- 'processing' | 'done'
    response    JSONB,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '10 minutes'
);

-- Index for the periodic cleanup query (DELETE WHERE expires_at < now())
CREATE INDEX IF NOT EXISTS idx_synthesis_requests_expires_at
    ON synthesis_requests (expires_at);

-- Only the Edge Function's service_role key may access this table.
-- No user-level SELECT/INSERT/UPDATE/DELETE allowed.
ALTER TABLE synthesis_requests ENABLE ROW LEVEL SECURITY;
