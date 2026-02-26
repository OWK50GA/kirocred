/**
 * Database tests for Kirocred
 * Run with: npm test src/db/db.test.ts
 */

import { DatabaseClient } from './index';
import { unlinkSync } from 'fs';

const TEST_DB_PATH = './test-db.db';

describe('DatabaseClient', () => {
  let db: DatabaseClient;

  beforeEach(() => {
    // Create fresh database for each test
    try {
      unlinkSync(TEST_DB_PATH);
    } catch (e) {
      // File doesn't exist, that's fine
    }
    db = new DatabaseClient(TEST_DB_PATH);
  });

  afterEach(() => {
    db.close();
    try {
      unlinkSync(TEST_DB_PATH);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Organization operations', () => {
    it('should insert and retrieve organization', () => {
      db.insertOrganization({
        org_id: 1,
        org_name: 'Test University'
      });

      const org = db.getOrganization(1);
      expect(org).toBeDefined();
      expect(org?.org_id).toBe(1);
      expect(org?.org_name).toBe('Test University');
    });

    it('should handle organization without name', () => {
      db.insertOrganization({
        org_id: 2,
        org_name: null
      });

      const org = db.getOrganization(2);
      expect(org).toBeDefined();
      expect(org?.org_id).toBe(2);
      expect(org?.org_name).toBeNull();
    });

    it('should return undefined for non-existent organization', () => {
      const org = db.getOrganization(999);
      expect(org).toBeUndefined();
    });
  });

  describe('Batch operations', () => {
    beforeEach(() => {
      // Setup: Create organization first
      db.insertOrganization({
        org_id: 1,
        org_name: 'Test Org'
      });
    });

    it('should insert and retrieve batch', () => {
      db.insertBatch({
        batch_id: 1,
        org_id: 1
      });

      const batch = db.getBatch(1);
      expect(batch).toBeDefined();
      expect(batch?.batch_id).toBe(1);
      expect(batch?.org_id).toBe(1);
    });

    it('should get batches by organization', () => {
      db.insertBatch({ batch_id: 1, org_id: 1 });
      db.insertBatch({ batch_id: 2, org_id: 1 });
      db.insertBatch({ batch_id: 3, org_id: 1 });

      const batches = db.getBatchesByOrg(1);
      expect(batches).toHaveLength(3);
      expect(batches.map(b => b.batch_id)).toEqual([1, 2, 3]);
    });

    it('should return empty array for org with no batches', () => {
      const batches = db.getBatchesByOrg(1);
      expect(batches).toEqual([]);
    });
  });

  describe('Credential operations', () => {
    beforeEach(() => {
      // Setup: Create org and batch
      db.insertOrganization({ org_id: 1, org_name: 'University' });
      db.insertBatch({ batch_id: 1, org_id: 1 });
    });

    it('should insert and retrieve credential', () => {
      db.insertCredential({
        holder_address: '0xholder1',
        batch_id: 1,
        ipfs_cid: 'QmTest123',
        credential_id: 'cred-uuid-1'
      });

      const creds = db.getCredentialsByHolder('0xholder1');
      expect(creds).toHaveLength(1);
      expect(creds[0].holder_address).toBe('0xholder1');
      expect(creds[0].ipfs_cid).toBe('QmTest123');
      expect(creds[0].credential_id).toBe('cred-uuid-1');
    });

    it('should get credentials with org info', () => {
      db.insertCredential({
        holder_address: '0xholder1',
        batch_id: 1,
        ipfs_cid: 'QmTest123',
        credential_id: 'cred-uuid-1'
      });

      const creds = db.getCredentialsByHolder('0xholder1');
      expect(creds[0].org_id).toBe(1);
      expect(creds[0].org_name).toBe('University');
    });

    it('should handle multiple credentials for same holder', () => {
      db.insertCredential({
        holder_address: '0xholder1',
        batch_id: 1,
        ipfs_cid: 'QmTest1',
        credential_id: 'cred-1'
      });
      db.insertCredential({
        holder_address: '0xholder1',
        batch_id: 1,
        ipfs_cid: 'QmTest2',
        credential_id: 'cred-2'
      });

      const creds = db.getCredentialsByHolder('0xholder1');
      expect(creds).toHaveLength(2);
    });

    it('should return empty array for holder with no credentials', () => {
      const creds = db.getCredentialsByHolder('0xnonexistent');
      expect(creds).toEqual([]);
    });

    it('should batch insert credentials', () => {
      db.insertCredentialsBatch([
        {
          holder_address: '0xholder1',
          batch_id: 1,
          ipfs_cid: 'QmTest1',
          credential_id: 'cred-1'
        },
        {
          holder_address: '0xholder1',
          batch_id: 1,
          ipfs_cid: 'QmTest2',
          credential_id: 'cred-2'
        },
        {
          holder_address: '0xholder2',
          batch_id: 1,
          ipfs_cid: 'QmTest3',
          credential_id: 'cred-3'
        }
      ]);

      const holder1Creds = db.getCredentialsByHolder('0xholder1');
      const holder2Creds = db.getCredentialsByHolder('0xholder2');

      expect(holder1Creds).toHaveLength(2);
      expect(holder2Creds).toHaveLength(1);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete credential issuance flow', () => {
      // 1. Register organization
      db.insertOrganization({
        org_id: 1,
        org_name: 'Test University'
      });

      // 2. Create batch
      db.insertBatch({
        batch_id: 1,
        org_id: 1
      });

      // 3. Issue credentials to multiple holders
      db.insertCredentialsBatch([
        {
          holder_address: '0xalice',
          batch_id: 1,
          ipfs_cid: 'QmAlice',
          credential_id: 'alice-cred'
        },
        {
          holder_address: '0xbob',
          batch_id: 1,
          ipfs_cid: 'QmBob',
          credential_id: 'bob-cred'
        }
      ]);

      // 4. Verify each holder can discover their credentials
      const aliceCreds = db.getCredentialsByHolder('0xalice');
      const bobCreds = db.getCredentialsByHolder('0xbob');

      expect(aliceCreds).toHaveLength(1);
      expect(aliceCreds[0].org_name).toBe('Test University');
      expect(bobCreds).toHaveLength(1);
      expect(bobCreds[0].org_name).toBe('Test University');
    });

    it('should handle multiple organizations and batches', () => {
      // Create two organizations
      db.insertOrganization({ org_id: 1, org_name: 'University A' });
      db.insertOrganization({ org_id: 2, org_name: 'University B' });

      // Create batches for each
      db.insertBatch({ batch_id: 1, org_id: 1 });
      db.insertBatch({ batch_id: 2, org_id: 2 });

      // Issue credentials from both orgs to same holder
      db.insertCredential({
        holder_address: '0xholder',
        batch_id: 1,
        ipfs_cid: 'QmFromA',
        credential_id: 'cred-a'
      });
      db.insertCredential({
        holder_address: '0xholder',
        batch_id: 2,
        ipfs_cid: 'QmFromB',
        credential_id: 'cred-b'
      });

      // Holder should see credentials from both orgs
      const creds = db.getCredentialsByHolder('0xholder');
      expect(creds).toHaveLength(2);
      
      const orgNames = creds.map(c => c.org_name).sort();
      expect(orgNames).toEqual(['University A', 'University B']);
    });
  });
});
