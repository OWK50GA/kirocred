import crypto from 'crypto'
import cryptojs from 'crypto-js'

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