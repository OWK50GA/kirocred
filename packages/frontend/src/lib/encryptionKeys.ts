// Encryption key derivation from wallet signatures
// This allows holders to derive a deterministic encryption keypair from their wallet

import { ec, hash, stark, TypedData } from 'starknet';
import { feltToHex } from './verification';
import { hexToUint8Array } from './utils';

/**
 * Derive encryption keypair from a Starknet wallet signature
 * 
 * Flow:
 * 1. Holder signs a deterministic message with their wallet
 * 2. The signature's `r` component becomes the private key
 * 3. Derive the public key from this private key
 * 4. This keypair is used for ECIES encryption/decryption
 * 
 * @param signature - Starknet signature array [r, s] or object {r, s}
 * @returns Object with privateKey (hex string) and publicKey (hex string with 0x04 prefix)
 */
export function deriveEncryptionKeypair(signature: string[] | { r: string; s: string }): {
  privateKey: string;
  publicKey: string;
} {
  // Extract r component from signature
  let r: string;
  if (Array.isArray(signature)) {

    if (signature.length === 3) {
      r = signature[1];
    } else if (signature.length === 9) {
      r = signature[2];
    } else {
      return { privateKey: "0", publicKey: "0" }
    }
  } else {
    r = signature.r;
  }

  const hexR = feltToHex(BigInt(r))
  
  const fullPubKey = stark.getFullPublicKey(hexR)
  
  return {
    privateKey: hexR,
    publicKey: fullPubKey,
  };
}

/**
 * Get the deterministic message that should be signed for key derivation
 * This message is stored in environment variables and is the same for all users
 * 
 * @returns The message to sign
 */
export function getKeyDerivationMessage(): string {
  const message = process.env.NEXT_PUBLIC_KEY_DERIVATION_MESSAGE;
  if (!message) {
    throw new Error('NEXT_PUBLIC_KEY_DERIVATION_MESSAGE not configured');
  }
  return message;
}

/**
 * Create a typed data structure for signing the key derivation message
 * This ensures deterministic signatures across different wallets
 * 
 * @returns TypedData object for wallet signing
 */
export function createKeyDerivationTypedData(): TypedData {
  const message = getKeyDerivationMessage();
  
  return {
    domain: {
      name: 'Kirocred',
      version: '1',
      chainId: 'SN_SEPOLIA',
    },
    types: {
      StarkNetDomain: [
        { name: 'name', type: 'felt' },
        { name: 'version', type: 'felt' },
        { name: 'chainId', type: 'felt' },
      ],
      EncryptionKeyDerivation: [
        { name: 'message', type: 'felt' },
        { name: 'purpose', type: 'felt' },
      ],
    },
    primaryType: 'EncryptionKeyDerivation',
    message: {
      message: message,
      purpose: 'Derive encryption keypair',
    },
  };
}
