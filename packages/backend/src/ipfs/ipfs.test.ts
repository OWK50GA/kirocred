import { IPFSClient, createIPFSClient, EncryptedPackage } from './index';
import crypto from 'crypto';

// Mock Pinata SDK
jest.mock('pinata', () => {
  return {
    PinataSDK: jest.fn().mockImplementation(() => {
      const storage = new Map<string, any>();
      let cidCounter = 0;
      
      return {
        upload: {
          json: jest.fn().mockImplementation(async (data: any) => {
            const cid = `Qm${cidCounter++}${crypto.randomBytes(16).toString('hex')}`;
            storage.set(cid, data);
            return { IpfsHash: cid };
          })
        },
        gateways: {
          get: jest.fn().mockImplementation(async (cid: string) => {
            const data = storage.get(cid);
            if (!data) {
              throw new Error('CID not found');
            }
            return { data };
          })
        }
      };
    })
  };
});

describe('IPFS Client', () => {
  let client: IPFSClient;
  const testEncryptionKey = crypto.randomBytes(32);
  const mockPinataJwt = 'test-jwt-token';

  beforeEach(() => {
    client = createIPFSClient(mockPinataJwt, testEncryptionKey);
  });

  describe('Package Encryption and Storage', () => {
    test('should store and retrieve package with encryption', async () => {
      const testPackage = {
        leaf: '0xabcdef123456',
        pathElements: ['0x111', '0x222'],
        pathIndices: [0, 1],
        tokenId: 'token-123',
        batchId: 'batch-456'
      };

      // Store package
      const cid = await client.storePackage(testPackage);
      expect(cid).toBeDefined();
      expect(typeof cid).toBe('string');
      expect(cid.startsWith('Qm')).toBe(true);

      // Retrieve package
      const retrieved = await client.retrievePackage(cid);
      expect(retrieved).toEqual(testPackage);
    });

    test('should handle complex nested objects', async () => {
      const complexPackage = {
        metadata: {
          issuer: 'Test University',
          timestamp: Date.now()
        },
        credentials: [
          { id: '1', value: 'test1' },
          { id: '2', value: 'test2' }
        ],
        nested: {
          deep: {
            value: 'deeply nested'
          }
        }
      };

      const cid = await client.storePackage(complexPackage);
      const retrieved = await client.retrievePackage(cid);
      expect(retrieved).toEqual(complexPackage);
    });

    test('should encrypt data before storage', async () => {
      const testData = { secret: 'sensitive-data' };
      const cid = await client.storePackage(testData);

      // Access the mocked storage directly to verify encryption
      const pinataInstance = (client as any).pinata;
      const storedData = await pinataInstance.gateways.get(cid);
      
      // Verify stored data has encryption structure
      expect(storedData.data).toHaveProperty('encryptedData');
      expect(storedData.data).toHaveProperty('iv');
      expect(storedData.data).toHaveProperty('authTag');
      
      // Verify encrypted data is not plaintext
      expect(storedData.data.encryptedData).not.toContain('sensitive-data');
    });
  });

  describe('Pre-encrypted Package Storage', () => {
    test('should store and retrieve pre-encrypted packages', async () => {
      const encryptedPackage: EncryptedPackage = {
        encryptedData: '0xabcdef123456789',
        iv: '0x111222333',
        authTag: '0x444555666'
      };

      const cid = await client.storeEncryptedPackage(encryptedPackage);
      expect(cid).toBeDefined();

      const retrieved = await client.retrieveEncryptedPackage(cid);
      expect(retrieved).toEqual(encryptedPackage);
    });

    test('should not double-encrypt pre-encrypted packages', async () => {
      const encryptedPackage: EncryptedPackage = {
        encryptedData: 'already-encrypted-data',
        iv: 'test-iv',
        authTag: 'test-tag'
      };

      const cid = await client.storeEncryptedPackage(encryptedPackage);
      const retrieved = await client.retrieveEncryptedPackage(cid);
      
      // Should retrieve exact same structure
      expect(retrieved.encryptedData).toBe('already-encrypted-data');
      expect(retrieved.iv).toBe('test-iv');
      expect(retrieved.authTag).toBe('test-tag');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid CID', async () => {
      await expect(client.retrievePackage('invalid-cid'))
        .rejects.toThrow('Failed to retrieve package from IPFS');
    });

    test('should throw error for invalid encrypted package CID', async () => {
      await expect(client.retrieveEncryptedPackage('invalid-cid'))
        .rejects.toThrow('Failed to retrieve encrypted package from IPFS');
    });

    test('should handle storage failures gracefully', async () => {
      // Mock upload failure
      const pinataInstance = (client as any).pinata;
      pinataInstance.upload.json.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.storePackage({ test: 'data' }))
        .rejects.toThrow('Failed to store package on IPFS');
    });
  });

  describe('Encryption Key Management', () => {
    test('should use provided encryption key', () => {
      const customKey = crypto.randomBytes(32);
      const customClient = createIPFSClient(mockPinataJwt, customKey);
      
      expect((customClient as any).encryptionKey).toEqual(customKey);
    });

    test('should generate default key if not provided', () => {
      const defaultClient = createIPFSClient(mockPinataJwt);
      
      expect((defaultClient as any).encryptionKey).toBeDefined();
      expect((defaultClient as any).encryptionKey.length).toBe(32);
    });

    test('different keys should produce different encrypted data', async () => {
      const key1 = crypto.randomBytes(32);
      const key2 = crypto.randomBytes(32);
      
      const client1 = createIPFSClient(mockPinataJwt, key1);
      const client2 = createIPFSClient(mockPinataJwt, key2);
      
      const testData = { value: 'test' };
      
      const cid1 = await client1.storePackage(testData);
      const cid2 = await client2.storePackage(testData);
      
      // Different keys should produce different CIDs (different encrypted content)
      expect(cid1).not.toBe(cid2);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain data integrity through encryption round-trip', async () => {
      const testCases = [
        { simple: 'string' },
        { number: 12345 },
        { boolean: true },
        { array: [1, 2, 3, 4, 5] },
        { null: null },
        { nested: { deep: { value: 'test' } } }
      ];

      for (const testCase of testCases) {
        const cid = await client.storePackage(testCase);
        const retrieved = await client.retrievePackage(cid);
        expect(retrieved).toEqual(testCase);
      }
    });

    test('should handle empty objects', async () => {
      const emptyObj = {};
      const cid = await client.storePackage(emptyObj);
      const retrieved = await client.retrievePackage(cid);
      expect(retrieved).toEqual(emptyObj);
    });

    test('should handle large objects', async () => {
      const largeObj = {
        data: Array(1000).fill(null).map((_, i) => ({
          id: i,
          value: `value-${i}`,
          nested: { data: `nested-${i}` }
        }))
      };

      const cid = await client.storePackage(largeObj);
      const retrieved = await client.retrievePackage(cid);
      expect(retrieved).toEqual(largeObj);
    });
  });
});
