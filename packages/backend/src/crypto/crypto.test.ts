import {
  hashAttributes,
  generateSalt,
  computeCommitment,
  generateAESKey,
  encryptAttributes,
  decryptAttributes,
  encryptKeyToHolder,
  decryptKeyFromHolder,
  verifySignature,
  verifyIssuerSignature,
} from "./index";
import { BigNumberish, ec, hash, stark } from "starknet";
import crypto from "crypto";
import { json } from "stream/consumers";

describe("Crypto Module", () => {
  describe("Hash Functions", () => {
    test("hashAttributes produces consistent hash for same attributes", () => {
      const attrs = { name: "Alice", age: 30 };
      const hash1 = hashAttributes(attrs);
      const hash2 = hashAttributes(attrs);
      expect(hash1).toBe(hash2);
    });

    test("hashAttributes produces different hash for different attributes", () => {
      const attrs1 = { name: "Alice", age: 30 };
      const attrs2 = { name: "Bob", age: 25 };
      const hash1 = hashAttributes(attrs1);
      const hash2 = hashAttributes(attrs2);
      expect(hash1).not.toBe(hash2);
    });

    test("generateSalt produces unique salts", () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
      expect(salt1).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe("Commitment Computation", () => {
    test("computeCommitment produces consistent commitment", () => {
      const credId = "cred-123";
      const holderPubkey = "0x1234";
      const attrsHash = "0xabcd";
      const salt = "0x5678";

      const commitment1 = computeCommitment(
        credId,
        holderPubkey,
        attrsHash,
        salt,
      );
      const commitment2 = computeCommitment(
        credId,
        holderPubkey,
        attrsHash,
        salt,
      );

      expect(commitment1).toBe(commitment2);
    });
  });

  describe("AES-GCM Encryption", () => {
    test("generateAESKey produces 32-byte key", () => {
      const key = generateAESKey();
      expect(key.length).toBe(32);
    });

    test("encrypt and decrypt attributes round-trip", () => {
      const attributes = { name: "Alice", degree: "PhD" };
      const key = generateAESKey();

      const encrypted = encryptAttributes(attributes, key);
      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();

      const decrypted = decryptAttributes(
        encrypted.ciphertext,
        key,
        encrypted.iv,
        encrypted.authTag,
      );
      console.log("Decrypted: ", decrypted);
      console.log("Attributes: ", attributes);

      expect(JSON.stringify(decrypted)).toEqual(JSON.stringify(attributes));
    });
  });

  describe("ECIES Encryption", () => {
    test("encrypt and decrypt key round-trip", () => {
      // Use a valid Starknet private key (smaller than curve order)
      // This gets a holder private key that we will use to get the full public key
      const privateKey = stark.randomAddress();
      // const publicKey = ec.starkCurve.getStarkKey(privateKey);
      const publicKey = stark.getFullPublicKey(privateKey);
      const aesKey = generateAESKey();

      const encryptedKey = encryptKeyToHolder(aesKey, publicKey);
      expect(encryptedKey).toMatch(/^0x[0-9a-f]+$/);

      const decryptedKey = decryptKeyFromHolder(encryptedKey, privateKey);
      expect(decryptedKey.toString("hex")).toBe(aesKey.toString("hex"));
    });
  });

  describe("Signature Verification", () => {
    test("verifySignature with valid signature", () => {
      const privateKey = stark.randomAddress();
      const fullPublicKey = stark.getFullPublicKey(privateKey);
      const message: BigNumberish[] = [1, 128, 18, 14];

      const messageHash = hash.computeHashOnElements(message);
      const signature = ec.starkCurve.sign(messageHash, privateKey);

      const isValid = verifySignature(
        messageHash,
        signature,
        fullPublicKey as `0x${string}`,
      );
      expect(isValid).toBe(true);
    });

    test("verifyIssuerSignature delegates to verifySignature", () => {
      const privateKey = stark.randomAddress();
      const publicKey = stark.getFullPublicKey(privateKey);
      const messageHash =
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

      const signature = ec.starkCurve.sign(messageHash, privateKey);

      const isValid = verifyIssuerSignature(
        messageHash,
        signature,
        publicKey as `0x${string}`,
      );
      expect(isValid).toBe(true);
    });
  });
});
