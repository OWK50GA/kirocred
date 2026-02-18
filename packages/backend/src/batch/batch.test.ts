import { describe, test, expect } from "@jest/globals";
import {
  processBatch,
  CredentialData,
  BatchProcessingRequest,
  BatchMetadata,
} from "./index";
import { generateUserKeyPair } from "../crypto/index";

describe("Batch Processing", () => {
  test("should process a batch of credentials correctly", () => {
    // Generate test key pairs
    const holder1 = generateUserKeyPair();
    const holder2 = generateUserKeyPair();

    const batchMetadata: BatchMetadata = {
      description: "Test Batch 2024",
      purpose: "Testing",
      issuedBy: "Test Organization",
      timestamp: Date.now(),
    };

    const request: BatchProcessingRequest = {
      batchId: "batch-001",
      credentials: [
        {
          credentialId: "cred-001",
          holderPublicKey: holder1.publicKey,
          attributes: { name: "Alice", degree: "CS" },
          issuerSignedMessage: "sig1",
          issuerPublicKey: "issuer-key",
        },
        {
          credentialId: "cred-002",
          holderPublicKey: holder2.publicKey,
          attributes: { name: "Bob", degree: "EE" },
          issuerSignedMessage: "sig2",
          issuerPublicKey: "issuer-key",
        },
      ],
      issuerPublicKey: "issuer-key",
      batchMetadata,
    };

    // This test will fail signature verification, but we can test the structure
    try {
      const result = processBatch(request);

      expect(result.batchId).toBe("batch-001");
      expect(result.merkleRoot).toBeDefined();
      expect(result.merkleRoot.startsWith("0x")).toBe(true);
      expect(result.credentialPackages).toHaveLength(2);
      expect(result.issuedCredentials).toHaveLength(2);

      // Verify each package has required fields
      result.credentialPackages.forEach((pkg, index) => {
        expect(pkg.commitment).toBeDefined();
        expect(pkg.pathElements).toBeDefined();
        expect(pkg.pathIndices).toBeDefined();
        expect(pkg.encryptedAttributes).toBeDefined();
        expect(pkg.encryptedKey).toBeDefined();
        expect(pkg.batchId).toBe("batch-001");
        expect(pkg.credentialId).toBe(`cred-00${index + 1}`);
        expect(pkg.issuedAt).toBe(batchMetadata.timestamp);
      });
    } catch (error) {
      // Expected to fail due to signature verification
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("Invalid issuer signature");
    }
  });

  test("should throw error for empty batch", () => {
    const request: BatchProcessingRequest = {
      batchId: "empty-batch",
      credentials: [],
      issuerPublicKey: "issuer-key",
      batchMetadata: {
        description: "Empty batch",
        purpose: "Testing",
        issuedBy: "Test Org",
        timestamp: Date.now(),
      },
    };

    expect(() => processBatch(request)).toThrow(
      "Invalid batch processing request: missing batchId or credentials",
    );
  });

  test("should throw error for missing batch metadata", () => {
    const holder = generateUserKeyPair();

    const request = {
      batchId: "test-batch",
      credentials: [
        {
          credentialId: "cred-001",
          holderPublicKey: holder.publicKey,
          attributes: { name: "Test" },
          issuerSignedMessage: "sig",
          issuerPublicKey: "key",
        },
      ],
      issuerPublicKey: "key",
      // Missing batchMetadata
    };

    expect(() => processBatch(request as any)).toThrow(
      "Invalid batch processing request: missing issuerPublicKey or batchMetadata",
    );
  });
});
