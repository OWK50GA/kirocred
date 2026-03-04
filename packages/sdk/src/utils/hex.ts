// export function bytesToHex(bytes: Uint8Array): string {
//   return '0x' + Buffer.from(bytes).toString('hex');
// }

// export function hexToBytes(hex: string): Uint8Array {
//   const s = hex.startsWith('0x') ? hex.slice(2) : hex;
//   if (s.length % 2 !== 0) throw new Error('Invalid hex length');
//   return Uint8Array.from(Buffer.from(s, 'hex'));
// }

/** BigInt -> 0x hex (no fixed width) */
export function bigintToHex(n: bigint): string {
  return "0x" + n.toString(16);
}

/** BigInt -> fixed 32-byte hex */
export function bigintToHex32(n: bigint): string {
  return "0x" + n.toString(16).padStart(64, "0");
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

/**
 * Convert hex with 0x prefix to Uint8Array
 */
export function hexToUint8Array(hexString: string): Uint8Array {
  const hex = hexString.startsWith("0x") ? hexString.slice(2) : hexString;

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export function concatBytes(...arrays: any[]) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}