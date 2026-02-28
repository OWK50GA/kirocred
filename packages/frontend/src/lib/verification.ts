// Verification logic module for Kirocred credential verification
// This module implements all cryptographic verification functions

import { ec } from 'starknet';
import cryptoJs from 'crypto-js';
import { normalizeAddress, truncateBit256 } from './utils';

/**
 * Hash a hex buffer using SHA-256
 * @param hexData - Hex string (with or without 0x prefix)
 * @returns Hex string hash with 0x prefix
 */
function hashHexBuffer(hexData: string): string {
  const hex = hexData.startsWith('0x') ? hexData.slice(2) : hexData;
  
  // Parse hex string to WordArray for crypto-js
  const wordArray = cryptoJs.enc.Hex.parse(hex);
  
  // Hash using SHA-256
  const hash = cryptoJs.SHA256(wordArray);
  
  return '0x' + hash.toString(cryptoJs.enc.Hex);
}

/**
 * Hash a string using SHA-256 (browser-compatible)
 * @param input - String to hash
 * @returns Hex string hash with 0x prefix
 */
function hashString(input: string): string {
  const hash = cryptoJs.SHA256(input);
  return '0x' + hash.toString(cryptoJs.enc.Hex);
}

/**
 * Hash credential attributes using SHA-256
 * @param attributes - Credential attributes object
 * @returns Hex string hash of attributes
 */
export function hashAttributes(attributes: Record<string, any>): string {
  const sortedKeys = Object.keys(attributes).sort();
  const sortedAttrs = sortedKeys.reduce(
    (acc, key) => {
      acc[key] = attributes[key];
      return acc;
    },
    {} as Record<string, any>,
  );

  const attrString = JSON.stringify(sortedAttrs);
  // Use Node.js crypto for hashing the string
  const hashBuffer = cryptoJs.algo.SHA256.create().update(attrString).finalize();
  return "0x" + hashBuffer.toString(cryptoJs.enc.Hex);
}

/**
 * Hash two hex strings together (for merkle tree)
 * @param left - Left node hash
 * @param right - Right node hash
 * @returns Combined hash
 */
// function hashPair(left: string, right: string): string {
//   const leftHex = left.startsWith('0x') ? left.slice(2) : left;
//   const rightHex = right.startsWith('0x') ? right.slice(2) : right;
  
//   const combined = leftHex + rightHex;
//   return hashHexBuffer(combined);
// }

function hashPair(left: string, right: string): string {
  // Remove 0x prefix if present
  const leftHex = left.startsWith("0x") ? left.slice(2) : left;
  const rightHex = right.startsWith("0x") ? right.slice(2) : right;

  // Concatenate hex strings
  const combined = leftHex + rightHex;
  
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(combined.length / 2);
  for (let i = 0; i < combined.length; i += 2) {
    bytes[i / 2] = parseInt(combined.substring(i, i + 2), 16);
  }
  
  // Hash the Uint8Array
  return hashUint8Array(bytes);
}

/**
 * Hash a Uint8Array using SHA-256 (synchronous with crypto-js)
 * @param bytes - Uint8Array to hash
 * @returns Hex string hash with 0x prefix
 */
function hashUint8Array(bytes: Uint8Array): string {
  // Convert Uint8Array to hex string
  const hexString = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Parse hex to WordArray and hash
  const wordArray = cryptoJs.enc.Hex.parse(hexString);
  const hash = cryptoJs.SHA256(wordArray);
  
  return '0x' + hash.toString(cryptoJs.enc.Hex);
}

export function feltToHex(feltBigInt: bigint) {
  return `0x${feltBigInt.toString(16)}`;
}
/**
 * Verify merkle proof against a root
 * @param leaf - Leaf hash (commitment) to verify
 * @param pathElements - Sibling hashes along the path
 * @param pathIndices - Position indicators (0 = left sibling, 1 = right sibling)
 * @param expectedRoot - Expected merkle root
 * @returns True if proof is valid, false otherwise
 */
export function verifyMerkleProof(
  leaf: string,
  pathElements: string[],
  pathIndices: number[],
  expectedRoot: string
): boolean {
  try {
    if (pathElements.length !== pathIndices.length) {
      return false;
    }
    
    // Convert expectedRoot to hex if it's not already
    const expectedRootHex = feltToHex(BigInt(expectedRoot))
    
    // Handle edge case: single leaf tree
    if (pathElements.length === 0) {
      console.log("Single leaf tree - Leaf:", leaf);
      console.log("Expected root (original):", expectedRoot);
      console.log("Expected root (hex):", expectedRootHex);
      return truncateBit256(leaf) === expectedRootHex;
    }
    
    let currentHash = leaf;
    
    // Traverse path to root
    for (let i = 0; i < pathElements.length; i++) {
      const sibling = pathElements[i];
      const isRightSibling = pathIndices[i] === 1;
      
      if (isRightSibling) {
        // Current node is on left, sibling on right
        currentHash = hashPair(currentHash, sibling);
      } else {
        // Current node is on right, sibling on left
        currentHash = hashPair(sibling, currentHash);
      }
    }

    // const cleanCalculatedHash = currentHash.startsWith('0x') ? currentHash.slice(2) : currentHash;
    // const slicedCleanCalculatedHash = cleanCalculatedHash.slice(0, 60);
    // const calculatedHash = `0x${slicedCleanCalculatedHash}`;
    const calculatedHash = truncateBit256(currentHash);
    console.log("Calculated root: ", calculatedHash)
    
    return normalizeAddress(calculatedHash) === normalizeAddress(expectedRootHex);
  } catch (error) {
    console.error('Error verifying merkle proof:', error);
    return false;
  }
}

/**
 * Verify Starknet signature
 * @param messageHash - Hash of the message that was signed
 * @param signature - Signature as array [r, s] or object {r, s}
 * @param publicKey - Signer's public key (hex string)
 * @returns True if signature is valid, false otherwise
 */
export function verifySignature(
  messageHash: string,
  signature: any,
  publicKey: string
): boolean {
  try {
    // Use starknet.js verify function
    const result = ec.starkCurve.verify(
      signature,
      messageHash,
      publicKey
    );
    
    return result;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Verify issuer signature on a message
 * @param message - Message that was signed (or message hash)
 * @param signature - Issuer's signature
 * @param issuerPublicKey - Issuer's public key
 * @returns True if signature is valid, false otherwise
 */
export function verifyIssuerSignature(
  message: string,
  signature: any,
  issuerPublicKey: string
): boolean {
  try {
    return verifySignature(message, signature, issuerPublicKey);
  } catch (error) {
    console.error('Error verifying issuer signature:', error);
    return false;
  }
}

/**
 * Verify holder signature with nonce validation
 * @param messageHash - Hash of the message that was signed (e.g., nonce hash or typed data hash)
 * @param signature - Holder's signature over the message
 * @param holderPublicKey - Holder's encryption public key
 * @returns True if signature is valid, false otherwise
 */
export function verifyHolderSignature(
  messageHash: string,
  signature: any,
  holderPublicKey: string
): boolean {
  try {
    // Verify the signature against the message hash
    return verifySignature(messageHash, signature, holderPublicKey);
  } catch (error) {
    console.error('Error verifying holder signature:', error);
    return false;
  }
}

/**
 * Verify disclosed attributes match the commitment
 * @param disclosedAttrs - Disclosed attribute values
 * @param salts - Salts for each disclosed attribute
 * @param expectedAttributesHash - Expected hash from commitment
 * @returns True if disclosed attributes hash matches expected hash
 */
export function verifyDisclosedAttributes(
  disclosedAttrs: Record<string, any>,
  salts: Record<string, string>,
  expectedAttributesHash: string
): boolean {
  try {
    // Reconstruct attributes with salts
    const attrsWithSalts: Record<string, any> = {};
    
    for (const key in disclosedAttrs) {
      if (salts[key]) {
        attrsWithSalts[key] = {
          value: disclosedAttrs[key],
          salt: salts[key]
        };
      } else {
        // Missing salt for disclosed attribute
        return false;
      }
    }
    
    // Compute hash of disclosed attributes
    const computedHash = hashAttributes(attrsWithSalts);
    
    return computedHash === expectedAttributesHash;
  } catch (error) {
    console.error('Error verifying disclosed attributes:', error);
    return false;
  }
}

/**
 * Generate a fresh nonce for verification
 * @returns Random nonce string
 */
export function generateNonce(): string {
  // Generate a random nonce using crypto.getRandomValues
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for server-side rendering
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return '0x' + Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate that a nonce is fresh (not expired)
 * @param nonce - Nonce to validate
 * @param maxAgeSeconds - Maximum age in seconds (default: 300 = 5 minutes)
 * @returns True if nonce is valid and fresh
 */
export function validateNonce(nonce: string, maxAgeSeconds: number = 300): boolean {
  try {
    const nonceTimestamp = parseInt(nonce.slice(-13));

    const now = Date.now();

    const age = now - nonceTimestamp;

    if (age > 300 * 1000) { //might change if time window is too much
      return false;
    }
    
    return true
  } catch (error) {
    console.error('Error validating nonce:', error);
    return false;
  }
}

/**
 * Extract holder public key from commitment
 * Note: This is not directly possible from the commitment hash alone.
 * The holder public key must be provided separately or extracted from
 * the credential package structure.
 * @param commitment - Commitment hash
 * @returns null (cannot extract from hash)
 */
export function extractHolderPublicKey(commitment: string): string | null {
  // Cannot extract public key from commitment hash
  // This must be provided in the verification package
  return null;
}
