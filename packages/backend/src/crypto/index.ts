import { hash, ec, stark, num, typedData } from "starknet";
import crypto from "crypto";

/**
 * Hash credential attributes using keccak256
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
  const hashBuffer = crypto.createHash("sha256").update(attrString).digest();
  return "0x" + hashBuffer.toString("hex");
}

/**
 * Generate cryptographically secure random salt
 * @returns Hex string salt (32 bytes)
 */
export function generateSalt(): string {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

/**
 * Compute commitment using formula: H(cred_id || holder_pubkey || attributes_hash || salt)
 * @param credId - Credential ID (UUIDv4)
 * @param holderPubkey - Holder's Starknet public key (hex string)
 * @param attributesHash - Hash of credential attributes
 * @param salt - Random salt
 * @returns Commitment hash
 */
export function computeCommitment(
  credId: string,
  holderPubkey: string,
  attributesHash: string,
  salt: string,
): string {
  // Concatenate all inputs and hash
  const combined = credId + holderPubkey + attributesHash + salt;
  const hashBuffer = crypto.createHash("sha256").update(combined).digest();
  return "0x" + hashBuffer.toString("hex");
}

/**
 * Generate random 256-bit AES key
 * @returns Buffer containing 32 random bytes
 */
export function generateAESKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Encrypt credential attributes using AES-GCM
 * @param attributes - Credential attributes object
 * @param key - 256-bit AES key
 * @returns Object containing ciphertext, IV, and auth tag (all hex strings)
 */
export function encryptAttributes(
  attributes: Record<string, any>,
  key: Buffer,
): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintext = JSON.stringify(attributes);
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt credential attributes using AES-GCM
 * @param ciphertext - Encrypted data (hex string)
 * @param key - 256-bit AES key
 * @param iv - Initialization vector (hex string)
 * @param authTag - Authentication tag (hex string)
 * @returns Decrypted attributes object
 */
export function decryptAttributes(
  ciphertext: string,
  key: Buffer,
  iv: string,
  authTag: string,
): Record<string, any> {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let plaintext = decipher.update(ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");

  return JSON.parse(plaintext);
}

/**
 * Encrypt symmetric key to holder's Starknet public key using ECIES
 * @param key - AES key buffer to encrypt
 * @param holderPublicKey - Holder's Starknet public key (hex string)
 * @returns Encrypted key as hex string
 */
export function encryptKeyToHolder(
  key: Buffer,
  holderPublicKeyFull: string,
): string {
  // Generate ephemeral key pair - ensure it's within valid range
  const ephemeralPrivateKey: string = stark.randomAddress();
  const ephemeralPublicKeyFull =
    ec.starkCurve.getPublicKey(ephemeralPrivateKey);

  const holderPublicKeyHex = holderPublicKeyFull.slice(2);
  const ephemeralPubkeyHex = Buffer.from(ephemeralPublicKeyFull).toString(
    "hex",
  );

  // Compute shared secret
  let sharedSecret = ec.starkCurve.getSharedSecret(
    ephemeralPrivateKey,
    hexToUint8Array(holderPublicKeyFull),
  );
  const derivedKey = crypto
    .createHash("sha256")
    .update(Buffer.from(sharedSecret))
    .digest(); // 32 bytes

  // Encrypt the AES key using derived key
  const iv = crypto.randomBytes(12); //96-bit IV
  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);

  let encryptedKey = cipher.update(key);
  encryptedKey = Buffer.concat([encryptedKey, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Return: ephemeralPublicKey || iv || authTag || encryptedKey
  const epPubBuf = Buffer.from(ephemeralPubkeyHex, "hex");
  const result = Buffer.concat([epPubBuf, iv, authTag, encryptedKey]);

  return "0x" + result.toString("hex");
}

// THIS SHOULD GO TO THE FRONTEND
/**
 * Decrypt symmetric key using holder's Starknet private key (ECIES)
 * @param encryptedKey - Encrypted key (hex string)
 * @param holderPrivateKey - Holder's Starknet private key (hex string)
 * @returns Decrypted AES key buffer
 */
export function decryptKeyFromHolder(
  encryptedKey: string,
  holderPrivateKey: string,
): Buffer {
  const encryptedBuffer = Buffer.from(encryptedKey.slice(2), "hex");

  // Parse components: ephemeralPublicKey (32 bytes) || iv (12 bytes) || authTag (16 bytes) || encryptedKey
  const ephemeralPublicKeyHex = encryptedBuffer.subarray(0, 65).toString("hex");
  const iv = encryptedBuffer.subarray(65, 77);
  const authTag = encryptedBuffer.subarray(77, 93);
  const ciphertext = encryptedBuffer.subarray(93);

  // Derive decryption key using holder's private key and ephemeral public key
  // Must match encryption derivation
  // const combined = holderPrivateKey + ephemeralPublicKey;
  // Compute shared secret: holderPriv * ephemeralPub
  const sharedSecret = ec.starkCurve.getSharedSecret(
    holderPrivateKey,
    ephemeralPublicKeyHex,
  );

  const derivedKey = crypto
    .createHash("sha256")
    .update(Buffer.from(sharedSecret))
    .digest();
  // const derivedKey = crypto.createHash('sha256').update(combined).digest();

  // Decrypt the AES key
  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
  decipher.setAuthTag(authTag);

  let decryptedKey = decipher.update(ciphertext);
  decryptedKey = Buffer.concat([decryptedKey, decipher.final()]);

  return decryptedKey;
}

/**
 * Verify Starknet signature
 * @param message - Message that was signed (hex string or string)
 * @param signature - Signature as array [r, s] or object {r, s}
 * @param publicKey - Signer's public key (hex string)
 * @returns True if signature is valid, false otherwise
 * Will by typed data: https://starknetjs.com/docs/guides/account/signature/#verify-typeddata-outside-starknet
 */
export function verifySignature(
  messageHash: any,
  signature: any,
  publicKey: any,
): boolean {
  try {
    // const pubKeyHex = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

    // Verify using starknet.js verify function
    const result = ec.starkCurve.verify(signature, messageHash, publicKey);

    return result;
  } catch (error) {
    return false;
  }
}

/**
 * Verify issuer signature on a message
 * @param message - Message that was signed
 * @param signature - Issuer's signature
 * @param issuerPublicKey - Issuer's public key
 * @returns True if signature is valid, false otherwise
 */
export function verifyIssuerSignature(
  message: string,
  signature: any,
  issuerPublicKey: string,
): boolean {
  return verifySignature(message, signature, issuerPublicKey);
}

export interface UserKeyPair {
  privateKey: string; // 0x + 64 hex chars
  publicKey: string; // Full 65-byte uncompressed (0x04 + x + y)
  starkKey: string; // StarkKey format (0x + 64 hex chars)
}

// FOr testing

export function generateUserKeyPair(): UserKeyPair {
  const privateKey = stark.randomAddress();
  const publicKeyFull = ec.starkCurve.getPublicKey(privateKey); // Uint8Array
  const starkKey = ec.starkCurve.getStarkKey(privateKey);

  return {
    privateKey,
    publicKey: "0x" + Buffer.from(publicKeyFull).toString("hex"),
    starkKey,
  };
}

export function hexToUint8Array(hexString: string): Uint8Array {
  // Remove 0x prefix if present
  const hex = hexString.startsWith("0x") ? hexString.slice(2) : hexString;

  // Create Uint8Array from hex string
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array back to hex string with 0x prefix
 */
export function uint8ArrayToHex(uint8Array: Uint8Array): string {
  return (
    "0x" +
    Array.from(uint8Array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
