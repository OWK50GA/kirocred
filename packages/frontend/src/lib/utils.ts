import crypto from 'crypto'
import cryptojs from 'crypto-js'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ec, WeierstrassSignatureType } from 'starknet'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
//   const hashBuffer = crypto.createHash("sha256").update(attrString).digest();
  const hashBuffer = cryptojs.algo.SHA224.create().update(attrString).finalize();
  return "0x" + hashBuffer.toString(cryptojs.enc.Hex);
}

export function truncateBit256(bit256: string): `0x${string}` {
  const cleanedBit256 = bit256.startsWith('0x') ? bit256.slice(2) : bit256;
  const slicedBit256 = cleanedBit256.slice(0, 60);

  return `0x${slicedBit256}`
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

export function hexToUint8Array(hex: string): Uint8Array {
  let clean = hex.replace(/^0x/, '');
  if (clean.length % 2 !== 0) clean = '0' + clean;
  const pairs = clean.match(/.{1,2}/g)!;
  return new Uint8Array(pairs.map(byte => parseInt(byte, 16)));
}

export function compressPublicKey(fullPublicKey: string): string {
  // Remove 0x prefix
  const hex = fullPublicKey.startsWith('0x') ? fullPublicKey.slice(2) : fullPublicKey;
  
  // Validate length: 1 byte version + 32 bytes x + 32 bytes y = 65 bytes = 130 hex chars
  if (hex.length !== 130) {
    throw new Error(`Invalid full public key length: expected 130 hex chars, got ${hex.length}`);
  }
  
  // Verify version byte is 04 (uncompressed format)
  if (hex.slice(0, 2) !== '04') {
    throw new Error(`Invalid version byte: expected 04, got ${hex.slice(0, 2)}`);
  }
  
  // Extract x-coordinate (next 64 chars)
  const xHex = hex.slice(2, 66);
  return '0x' + xHex;
}