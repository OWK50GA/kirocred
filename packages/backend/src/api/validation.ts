// Request validation schemas
// Using a simple validation approach since we don't have joi/yup in dependencies

export interface IssueCredentialRequest {
  holderPublicKey: string; // Starknet public key (hex)
  credentialId: string; // UUIDv4
  attributes: Record<string, any>; // Credential attributes
  issuerSignedMessage: string; // Signature from issuer's private key
  // issuerPublicKey: string; // Issuer's public key
  issuerAddress: string;
  issuerMessageHash: string;
}

export interface ProcessBatchRequest {
  // batchId: string; // UUIDv4
  credentials: Array<{
    holderPublicKey: string;
    credentialId: string;
    attributes: Record<string, any>;
    issuerSignedMessage: string;
  }>;
  // issuerPublicKey: string; // Issuer's public key for this batch
  issuerAddress: string;
  batchMetadata: {
    description: string;
    purpose: string;
    issuedBy: string;
  };
}

export interface RevokeCredentialRequest {
  commitment: string; // Commitment hash, not token_id
  batchId: string;
  reason: string;
}

// Response interfaces
export interface IssueCredentialResponse {
  success: boolean;
  credentialId: string;
  commitment: string;
  message?: string;
}

export interface ProcessBatchResponse {
  success: boolean;
  batchId: string;
  merkleRoot: string;
  credentials: Array<{
    credentialId: string;
    ipfsCid: string; // No token_id - holder gets CID directly
  }>;
  transactionHash: string;
}

export interface RevokeCredentialResponse {
  success: boolean;
  commitment: string;
  transactionHash: string;
}

// Validation functions
export function validateIssueCredentialRequest(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.holderPublicKey || typeof data.holderPublicKey !== "string") {
    errors.push("holderPublicKey is required and must be a string");
  }

  if (!data.credentialId || typeof data.credentialId !== "string") {
    errors.push("credentialId is required and must be a string");
  }

  if (!data.attributes || typeof data.attributes !== "object") {
    errors.push("attributes is required and must be an object");
  }

  if (
    !data.issuerSignedMessage
    // || typeof data.issuerSignedMessage !== "string"
  ) {
    errors.push("issuerSignedMessage is required and must be a string");
  }

  if (!data.issuerAddress || typeof data.issuerAddress !== "string") {
    errors.push("issuerAddress is required and must be a string");
  }

  // Validate UUID format for credentialId
  if (data.credentialId && !isValidUUID(data.credentialId)) {
    errors.push("credentialId must be a valid UUIDv4");
  }

  // Validate hex format for public keys
  if (data.holderPublicKey && !isValidHex(data.holderPublicKey)) {
    errors.push("holderPublicKey must be a valid hex string");
  }

  if (data.issuerAddress && !isValidHex(data.issuerAddress)) {
    errors.push("issuerAddress must be a valid hex string");
  }

  return { isValid: errors.length === 0, errors };
}

export function validateProcessBatchRequest(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.batchId || typeof data.batchId !== "string") {
    errors.push("batchId is required and must be a string");
  }

  if (!data.credentials || !Array.isArray(data.credentials)) {
    errors.push("credentials is required and must be an array");
  }

  if (!data.issuerAddress || typeof data.issuerAddress !== "string") {
    errors.push("issuerAddress is required and must be a string");
  }

  if (!data.batchMetadata || typeof data.batchMetadata !== "object") {
    errors.push("batchMetadata is required and must be an object");
  }

  // Validate batchId UUID format
  if (data.batchId && !isValidUUID(data.batchId)) {
    errors.push("batchId must be a valid UUIDv4");
  }

  // Validate issuer public key hex format
  if (data.issuerAddress && !isValidHex(data.issuerAddress)) {
    errors.push("issuerAddress must be a valid hex string");
  }

  // Validate batch metadata
  if (data.batchMetadata) {
    if (
      !data.batchMetadata.description ||
      typeof data.batchMetadata.description !== "string"
    ) {
      errors.push("batchMetadata.description is required and must be a string");
    }
    if (
      !data.batchMetadata.purpose ||
      typeof data.batchMetadata.purpose !== "string"
    ) {
      errors.push("batchMetadata.purpose is required and must be a string");
    }
    if (
      !data.batchMetadata.issuedBy ||
      typeof data.batchMetadata.issuedBy !== "string"
    ) {
      errors.push("batchMetadata.issuedBy is required and must be a string");
    }
  }

  // Validate credentials array
  if (data.credentials && Array.isArray(data.credentials)) {
    data.credentials.forEach((cred: any, index: number) => {
      if (!cred.holderPublicKey || typeof cred.holderPublicKey !== "string") {
        errors.push(
          `credentials[${index}].holderPublicKey is required and must be a string`,
        );
      }
      if (!cred.credentialId || typeof cred.credentialId !== "string") {
        errors.push(
          `credentials[${index}].credentialId is required and must be a string`,
        );
      }
      if (!cred.attributes || typeof cred.attributes !== "object") {
        errors.push(
          `credentials[${index}].attributes is required and must be an object`,
        );
      }
      if (
        !cred.issuerSignedMessage
        // ||
        // typeof cred.issuerSignedMessage !== "string"
      ) {
        errors.push(
          `credentials[${index}].issuerSignedMessage is required and must be a string`,
        );
      }

      // Validate UUID and hex formats
      if (cred.credentialId && !isValidUUID(cred.credentialId)) {
        errors.push(
          `credentials[${index}].credentialId must be a valid UUIDv4`,
        );
      }
      if (cred.holderPublicKey && !isValidHex(cred.holderPublicKey)) {
        errors.push(
          `credentials[${index}].holderPublicKey must be a valid hex string`,
        );
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

export function validateRevokeCredentialRequest(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.commitment || typeof data.commitment !== "string") {
    errors.push("commitment is required and must be a string");
  }

  if (!data.batchId || typeof data.batchId !== "string") {
    errors.push("batchId is required and must be a string");
  }

  if (!data.reason || typeof data.reason !== "string") {
    errors.push("reason is required and must be a string");
  }

  // Validate hex format for commitment
  if (data.commitment && !isValidHex(data.commitment)) {
    errors.push("commitment must be a valid hex string");
  }

  // Validate UUID format for batchId
  if (data.batchId && !isValidUUID(data.batchId)) {
    errors.push("batchId must be a valid UUIDv4");
  }

  return { isValid: errors.length === 0, errors };
}

// Helper validation functions
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidHex(hex: string): boolean {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(cleanHex) && cleanHex.length > 0;
}
export interface RegisterOrganizationRequest {
  orgAddress: string; // Organization's Starknet address (hex)
  orgName?: string;   // Optional organization name
  signature: {
    r: string;
    s: string;
  }; // Signature to prove ownership and prevent spam
}

export interface RegisterOrganizationResponse {
  success: boolean;
  orgId?: string; // Organization ID from the event
  transactionHash: string;
  message?: string;
}

export function validateRegisterOrganizationRequest(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.orgAddress || typeof data.orgAddress !== "string") {
    errors.push("orgAddress is required and must be a string");
  }

  if (!data.signature || typeof data.signature !== "object") {
    errors.push("signature is required and must be an object");
  } else {
    if (!data.signature.r || typeof data.signature.r !== "string") {
      errors.push("signature.r is required and must be a string");
    }
    if (!data.signature.s || typeof data.signature.s !== "string") {
      errors.push("signature.s is required and must be a string");
    }
  }

  // Validate hex format for addresses
  if (data.orgAddress && !isValidHex(data.orgAddress)) {
    errors.push("orgAddress must be a valid hex string");
  }

  // Validate hex format for signature components
  if (data.signature?.r && !isValidHex(data.signature.r)) {
    errors.push("signature.r must be a valid hex string");
  }
  if (data.signature?.s && !isValidHex(data.signature.s)) {
    errors.push("signature.s must be a valid hex string");
  }

  return { isValid: errors.length === 0, errors };
}
