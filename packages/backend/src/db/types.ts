/**
 * Database types for Kirocred backend
 * Minimal schema for credential discovery only
 */

export interface Organization {
  org_id: number;           // From blockchain
  org_name: string | null;  // Optional organization name
}

export interface Batch {
  batch_id: number;         // From blockchain
  org_id: number;           // Foreign key
}

export interface Credential {
  holder_address: string;   // Holder's address
  batch_id: number;         // Foreign key
  ipfs_cid: string;         // IPFS CID for credential package
  credential_id: string;    // UUID
}
