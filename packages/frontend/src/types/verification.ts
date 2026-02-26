// Verification types for Kirocred system

export interface VerificationRequest {
  batchId: string;
  commitment: string;              // Commitment hash (not token_id)
  pathElements: string[];
  pathIndices: number[];
  issuerSignedMessage: string;
  // issuerAddress is now fetched from blockchain using batchId
  messageHash: string;
  holderSignature: string;         // Signature over verifier's nonce (signed with encryption private key)
  holderEncryptionPublicKey: string; // Holder's encryption public key (not wallet public key)
  nonce: string;                   // Fresh nonce from verifier
  disclosedAttributes?: {          // Optional selective disclosure
    attributes: Record<string, any>;
    salts: Record<string, string>;
  };
}

export interface VerificationResult {
  valid: boolean;
  checks: {
    merkleProofValid: boolean;
    issuerSignatureValid: boolean;
    holderSignatureValid: boolean;
    nonceValid: boolean;           // Nonce is fresh and correctly signed
    notRevoked: boolean;
    attributesMatch: boolean;      // Only if disclosed
  };
  batchMetadata: BatchMetadata;
  disclosedAttributes?: Record<string, any>;
  errors?: string[];
}

export interface BatchMetadata {
  description: string;             // e.g., "University Degrees 2024"
  purpose: string;                 // e.g., "Academic credentials"
  issuedBy: string;                // Organization name
  timestamp: number;               // Unix timestamp
}

export interface CompactVerificationPackage {
  batchId: string;
  commitment: string;              // Commitment hash (not token_id)
  pathElements: string[];
  pathIndices: number[];
  issuerSignedMessage: string;
  // issuerAddress is now fetched from blockchain using batchId
  holderSignature: string;         // Signature over verifier's nonce (signed with encryption private key)
  holderPublicKey: string; // Holder's encryption public key (not wallet public key)
  messageHash: string;
  nonce: string;                   // Fresh nonce from verifier
  disclosedAttributes?: {
    attributes: Record<string, any>;
    salts: Record<string, string>;
  };
}

export interface CommitmentData {
  credentialId: string;            // UUIDv4
  holderPublicKey: string;         // Starknet public key
  attributesHash: string;          // Hash of all attributes
  salt: string;                    // Random salt
}

// Commitment = H(credentialId || holderPublicKey || attributesHash || salt)