-- Migration: Add company_name column to watchlist table if it doesn't exist
-- Run this in the Supabase SQL Editor

ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Optional: backfill any existing rows that have a null company_name
-- (they'll show the symbol as the name instead — safe to leave as-is)
