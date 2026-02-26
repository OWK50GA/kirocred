import { hash, ec, stark, num, typedData, RpcProvider } from "starknet";
import crypto from "crypto";
import { envConfig } from "../config";

const { starknetRpcUrl } = envConfig;
const provider = new RpcProvider({ nodeUrl: starknetRpcUrl });

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
    hexToUint8Array(starkKeyToFullPublicKey(holderPublicKeyFull)),
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
export async function verifySignature(
  messageHash: any,
  signature: any,
  // publicKey: any,
  accountAddress: `0x${string}`,
): Promise<boolean> {
  try {
    // const pubKeyHex = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

    // Verify using starknet.js verify function
    // const result = ec.starkCurve.verify(signature, messageHash, publicKey);
    const result = await provider.verifyMessageInStarknet(
      messageHash,
      signature,
      accountAddress,
    );

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
export async function verifyIssuerSignature(
  message: string,
  signature: any,
  // issuerPublicKey: string,
  issuerAccountAddress: `0x${string}`,
): Promise<boolean> {
  return await verifySignature(message, signature, issuerAccountAddress);
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

const { CURVE } = ec.starkCurve;
const p = CURVE.p;          // modulus
const a = CURVE.a;          // α = 1n
const b = CURVE.b;          // β

/**
 * Convert a StarkKey (x-coordinate) to full uncompressed public key (0x04 + x + y)
 * @param starkKey - Hex string (with or without 0x) of the x-coordinate
 * @returns Full public key as 0x04 + x + y (130 hex chars + 0x)
 */
export function starkKeyToFullPublicKey(starkKey: string): string {
  const normalizedKey = normalizeAddress(starkKey);
  // Normalize x
  const xHex = normalizedKey.startsWith('0x') ? normalizedKey.slice(2) : normalizedKey;
  if (xHex.length !== 64) {
    throw new Error(`Invalid StarkKey: expected 64 hex chars, got ${xHex.length}`);
  }
  const x = BigInt('0x' + xHex);

  // Compute y² = x³ + a·x + b mod p
  const x2 = (x * x) % p;
  const x3 = (x2 * x) % p;
  const ax = (a * x) % p;
  const ySquared = (x3 + ax + b) % p;

  // Check that ySquared is a quadratic residue (should be for a valid public key)
  if (legendre(ySquared, p) !== 1n) {
    throw new Error('x does not correspond to a point on the curve');
  }

  // Compute modular square root using Tonelli–Shanks
  const y = sqrtMod(ySquared, p);

  // Format y as 64 hex chars
  const yHex = y.toString(16).padStart(64, '0');
  return '0x04' + xHex + yHex;
}

/**
 * Legendre symbol (a/p). Returns 1 if a is a quadratic residue, -1 if non-residue, 0 if divisible by p.
 */
function legendre(a: bigint, p: bigint): bigint {
  const exp = (p - 1n) / 2n;
  const res = modPow(a, exp, p);
  if (res === 0n) return 0n;
  return res === 1n ? 1n : -1n;
}

/**
 * Modular exponentiation: base^exp mod modulus
 */
function modPow(base: bigint, exp: bigint, modulus: bigint): bigint {
  let result = 1n;
  let b = base % modulus;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e >>= 1n;
  }
  return result;
}

/**
 * Tonelli–Shanks algorithm for modular square root.
 * Returns r such that r² ≡ n (mod p), assuming n is a quadratic residue and p is an odd prime.
 */
function sqrtMod(n: bigint, p: bigint): bigint {
  if (p % 4n === 3n) {
    // Simple case for p ≡ 3 mod 4
    return modPow(n, (p + 1n) / 4n, p);
  }

  // Factor p-1 as Q * 2^S, with Q odd
  let Q = p - 1n;
  let S = 0n;
  while (Q % 2n === 0n) {
    Q /= 2n;
    S++;
  }

  // Find a quadratic non-residue z
  let z = 2n;
  while (legendre(z, p) !== -1n) {
    z++;
  }

  let c = modPow(z, Q, p);
  let R = modPow(n, (Q + 1n) / 2n, p);
  let t = modPow(n, Q, p);
  let M = S;

  while (t !== 1n) {
    // Find the smallest i (0 < i < M) such that t^(2^i) == 1
    let i = 0n;
    let t2i = t;
    while (t2i !== 1n) {
      t2i = modPow(t2i, 2n, p);
      i++;
      if (i >= M) throw new Error('Tonelli–Shanks failed');
    }

    // Compute b = c^(2^(M-i-1))
    let exp = 1n << (M - i - 1n); // 2^(M-i-1)
    let b = modPow(c, exp, p);

    // Update variables
    R = (R * b) % p;
    c = (b * b) % p;
    t = (t * c) % p;
    M = i;
  }

  return R;
}

export function normalizeAddress(address: string) {
  if (typeof address !== 'string') {
    throw new TypeError('Address must be a string');
  }

  // Ensure it starts with "0x"
  if (!address.startsWith('0x')) {
    throw new Error('Address must start with "0x"');
  }

  // Remove "0x" for processing
  let hexPart = address.slice(2);

  // Remove unnecessary leading zeros but keep at least one '0'
  hexPart = hexPart.replace(/^0+/, '') || '0';

  // Pad back to 64 characters
  hexPart = hexPart.padStart(64, '0');

  // Ensure it starts with "0x0"
  return `0x0${hexPart.slice(1)}`; // Force the second character to be '0'
}