-- Kirocred Database Schema (PostgreSQL)
-- Minimal schema for credential discovery

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  org_id INTEGER PRIMARY KEY,
  org_name TEXT
);

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
  batch_id INTEGER PRIMARY KEY,
  org_id INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(org_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_org ON batches(org_id);

-- Credentials table (key table for discovery)
CREATE TABLE IF NOT EXISTS credentials (
  holder_address TEXT NOT NULL,
  batch_id INTEGER NOT NULL,
  ipfs_cid TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
);

CREATE INDEX IF NOT EXISTS idx_holder_address ON credentials(holder_address);
CREATE INDEX IF NOT EXISTS idx_batch_id ON credentials(batch_id);
