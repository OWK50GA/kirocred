/**
 * Database test script
 * Run with: npx tsx src/db/init.ts
 */

import { DatabaseClient } from './index';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDatabase() {
  console.log('🗄️  Testing Kirocred Database...\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

  const db = new DatabaseClient();

  try {
    // Test 1: Insert organization
    console.log('✓ Creating test organization...');
    await db.insertOrganization({
      org_id: 1,
      org_name: 'Test University'
    });

    // Test 2: Insert batch
    console.log('✓ Creating test batch...');
    await db.insertBatch({
      batch_id: 1,
      org_id: 1
    });

    // Test 3: Insert credentials
    console.log('✓ Creating test credentials...');
    await db.insertCredentialsBatch([
      {
        holder_address: '0xholder1',
        batch_id: 1,
        ipfs_cid: 'QmTest1',
        credential_id: 'cred-uuid-1'
      },
      {
        holder_address: '0xholder1',
        batch_id: 1,
        ipfs_cid: 'QmTest2',
        credential_id: 'cred-uuid-2'
      },
      {
        holder_address: '0xholder2',
        batch_id: 1,
        ipfs_cid: 'QmTest3',
        credential_id: 'cred-uuid-3'
      }
    ]);

    // Test 4: Query credentials by holder
    console.log('\n✓ Querying credentials for holder1...');
    const holder1Creds = await db.getCredentialsByHolder('0xholder1');
    console.log(`  Found ${holder1Creds.length} credentials:`);
    holder1Creds.forEach((cred: any) => {
      console.log(`    - ${cred.credential_id} (IPFS: ${cred.ipfs_cid}, Org: ${cred.org_name})`);
    });

    console.log('\n✓ Querying credentials for holder2...');
    const holder2Creds = await db.getCredentialsByHolder('0xholder2');
    console.log(`  Found ${holder2Creds.length} credentials:`);
    holder2Creds.forEach((cred: any) => {
      console.log(`    - ${cred.credential_id} (IPFS: ${cred.ipfs_cid}, Org: ${cred.org_name})`);
    });

    console.log('\n✅ All database tests passed!');
    console.log('\n📊 Database connected successfully');

  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

testDatabase().catch(console.error);
