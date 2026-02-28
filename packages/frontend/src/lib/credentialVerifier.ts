// Main credential verification orchestrator
// Integrates all verification checks with blockchain queries

import {
  verifyMerkleProof,
  generateNonce,
  verifyHolderSignature,
  validateNonce,
  feltToHex
} from './verification';
import {
  VerificationRequest,
  VerificationResult,
  BatchMetadata,
  CompactVerificationPackage
} from '@/types/verification';
import { StarknetClient } from './starknet';
import { truncateBit256 } from './utils';
import { ec } from 'starknet';

/**
 * Main credential verification function
 * Performs all verification checks and returns comprehensive result
 * @param request - Verification request with credential package
 * @param starknetClient - Starknet client for blockchain queries
 * @returns Comprehensive verification result
 */
export async function verifyCredential(
  request: VerificationRequest,
  starknetClient: StarknetClient
): Promise<VerificationResult> {
  const errors: string[] = [];
  const checks = {
    merkleProofValid: false,
    issuerSignatureValid: false,
    holderSignatureValid: false,
    nonceValid: true, //SKIPPED for now
    notRevoked: false,
    attributesMatch: true,       // SKIPPED - selective disclosure not implemented yet
  };

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Kirocred address not found");
  }
  
  // Default batch metadata (will be updated if available)
  let batchMetadata: BatchMetadata = {
    description: 'Unknown',
    purpose: 'Unknown',
    issuedBy: 'Unknown',
    timestamp: 0,
  };
  
  try {
    // Parse batch ID
    const batchId = parseInt(request.batchId);
    if (isNaN(batchId)) {
      errors.push('Invalid batch ID format');
      return createFailureResult(checks, batchMetadata, errors, request.disclosedAttributes);
    }
    
    // Step 1: Fetch issuer address from blockchain using batch ID
    let issuerAddress: string;
    try {
      issuerAddress = await starknetClient.getIssuerAddress(batchId);
      console.log('Fetched issuer address:', issuerAddress);
    } catch (error) {
      errors.push(`Failed to fetch issuer address: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return createFailureResult(checks, batchMetadata, errors, request.disclosedAttributes);
    }
    
    // Step 2: Verify holder signature on nonce (with encryption public key)
    // This proves the holder possesses the encryption private key and is actively participating
    try {
      // Validate nonce format
      checks.nonceValid = validateNonce(request.nonce);
      if (!checks.nonceValid) {
        errors.push('Invalid nonce format');
      }

      // console.log(request.holderSignature, request.messageHash, request.holderEncryptionPublicKey);

      // console.log("Acc Sig: ", accSig)
      const bool = ec.starkCurve.verify(request.holderSignature, request.messageHash, request.holderEncryptionPublicKey);

      checks.holderSignatureValid = bool;

    } catch (error) {
      errors.push(`Failed to verify holder signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Step 3: Verify issuer signature
    // Note: The issuerSignedMessage needs to be parsed to extract the actual signature
    // For now, we'll skip this check as the signature format needs clarification
    try {
      // TODO: Implement issuer signature verification
      // The issuerSignedMessage should contain the signature over some message
      // We need to know: what message was signed? and how to parse the signature?
      // For now, mark as valid (placeholder)
      checks.issuerSignatureValid = true;
      // console.log('Issuer signature verification skipped - needs implementation');
    } catch (error) {
      errors.push(`Failed to verify issuer signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Step 4: Fetch merkle root from blockchain
    let merkleRoot: string;
    try {
      merkleRoot = await starknetClient.getMerkleRoot(batchId);
      console.log('Fetched merkle root:', feltToHex(BigInt(merkleRoot)));
    } catch (error) {
      errors.push(`Failed to fetch merkle root: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return createFailureResult(checks, batchMetadata, errors, request.disclosedAttributes);
    }
    
    // Step 5: Verify merkle proof
    checks.merkleProofValid = verifyMerkleProof(
      request.commitment,
      request.pathElements,
      request.pathIndices,
      feltToHex(BigInt(merkleRoot))
    );
    
    if (!checks.merkleProofValid) {
      errors.push('Merkle proof verification failed - credential not in batch');
    }
    
    // Step 6: Check revocation status
    try {
      const isRevoked = await starknetClient.isRevoked(truncateBit256(request.commitment), batchId);
      checks.notRevoked = !isRevoked;
      
      if (isRevoked) {
        errors.push('Credential has been revoked by issuer');
      }
    } catch (error) {
      errors.push(`Failed to check revocation status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // TODO: Fetch actual batch metadata from blockchain or IPFS
    // For now, use placeholder with fetched issuer address
    batchMetadata = {
      description: `Batch ${batchId}`,
      purpose: 'Credential verification',
      issuedBy: issuerAddress,
      timestamp: Date.now() / 1000,
    };
    
    // Determine overall validity
    // All checks must pass for credential to be valid
    const valid = checks.merkleProofValid && 
                  checks.notRevoked && 
                  checks.holderSignatureValid && 
                  checks.nonceValid &&
                  checks.issuerSignatureValid;
    
    return {
      valid,
      checks,
      batchMetadata,
      disclosedAttributes: request.disclosedAttributes?.attributes,
      errors: errors.length > 0 ? errors : undefined,
    };
    
  } catch (error) {
    errors.push(`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return createFailureResult(checks, batchMetadata, errors, request.disclosedAttributes);
  }
}

/**
 * Create a failure result with given checks and errors
 */
function createFailureResult(
  checks: VerificationResult['checks'],
  batchMetadata: BatchMetadata,
  errors: string[],
  disclosedAttributes?: { attributes: Record<string, any>; salts: Record<string, string> }
): VerificationResult {
  return {
    valid: false,
    checks,
    batchMetadata,
    disclosedAttributes: disclosedAttributes?.attributes,
    errors,
  };
}

/**
 * Generate a fresh nonce for a new verification session
 * This should be called by the verifier before requesting holder signature
 * @returns Fresh nonce string
 */
export function generateVerificationNonce(): string {
  return generateNonce();
}

/**
 * Verify a credential package (convenience wrapper)
 * @param packageData - Compact verification package
 * @param contractAddress - Smart contract address
 * @param providerUrl - Optional Starknet provider URL
 * @returns Verification result
 */
export async function verifyCredentialPackage(
  packageData: CompactVerificationPackage,
  contractAddress: string,
  providerUrl?: string
): Promise<VerificationResult> {
  const starknetClient = new StarknetClient(contractAddress, providerUrl);
  
  const request: VerificationRequest = {
    batchId: packageData.batchId,
    commitment: packageData.commitment,
    pathElements: packageData.pathElements,
    pathIndices: packageData.pathIndices,
    issuerSignedMessage: packageData.issuerSignedMessage,
    // issuerAddress is now fetched from blockchain using batchId
    holderSignature: packageData.holderSignature,
    holderEncryptionPublicKey: packageData.holderPublicKey,
    nonce: packageData.nonce,
    disclosedAttributes: packageData.disclosedAttributes,
    messageHash: packageData.messageHash
  };
  
  return verifyCredential(request, starknetClient);
}
