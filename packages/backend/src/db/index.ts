import { Pool } from 'pg';
import { Organization, Batch, Credential } from './types';
import { envConfig } from '../config';

const { dbUrl } = envConfig;

/**
 * PostgreSQL database client for credential discovery
 */
export class DatabaseClient {
  private pool: Pool;

  constructor() {
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const useSSL = dbUrl.includes('render.com')
    
    this.pool = new Pool({
      connectionString: dbUrl,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    });
  }

  // Organization operations
  async insertOrganization(org: Organization) {
    const query = `
      INSERT INTO organizations (org_id, org_name)
      VALUES ($1, $2)
      ON CONFLICT (org_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.pool.query(query, [org.org_id, org.org_name]);
    return result.rows[0];
  }

  async getOrganization(org_id: number): Promise<Organization | undefined> {
    const query = `SELECT * FROM organizations WHERE org_id = $1`;
    const result = await this.pool.query(query, [org_id]);
    return result.rows[0];
  }

  // Batch operations
  async insertBatch(batch: Batch) {
    const query = `
      INSERT INTO batches (batch_id, org_id)
      VALUES ($1, $2)
      ON CONFLICT (batch_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.pool.query(query, [batch.batch_id, batch.org_id]);
    return result.rows[0];
  }

  async getBatch(batch_id: number): Promise<Batch | undefined> {
    const query = `SELECT * FROM batches WHERE batch_id = $1`;
    const result = await this.pool.query(query, [batch_id]);
    return result.rows[0];
  }

  async getBatchesByOrg(org_id: number): Promise<Batch[]> {
    const query = `SELECT * FROM batches WHERE org_id = $1`;
    const result = await this.pool.query(query, [org_id]);
    return result.rows;
  }

  // Credential operations
  async insertCredential(credential: Credential) {
    const query = `
      INSERT INTO credentials (holder_address, batch_id, ipfs_cid, credential_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      credential.holder_address,
      credential.batch_id,
      credential.ipfs_cid,
      credential.credential_id,
    ]);
    return result.rows[0];
  }

  /**
   * KEY METHOD: Get all credentials for a holder
   * Returns credentials with org info for display
   */
  async getCredentialsByHolder(holder_address: string): Promise<Array<Credential & { org_id: number; org_name: string | null }>> {
    const query = `
      SELECT 
        c.holder_address,
        c.batch_id,
        c.ipfs_cid,
        c.credential_id,
        b.org_id,
        o.org_name
      FROM credentials c
      JOIN batches b ON c.batch_id = b.batch_id
      JOIN organizations o ON b.org_id = o.org_id
      WHERE c.holder_address = $1
    `;
    const result = await this.pool.query(query, [holder_address]);
    return result.rows;
  }

  /**
   * Get all credentials issued on Kirocred (for verifiers)
   * Returns credentials with org and batch info
   */
  async getAllCredentials(): Promise<Array<Credential & { org_id: number; org_name: string | null }>> {
    const query = `
      SELECT 
        c.holder_address,
        c.batch_id,
        c.ipfs_cid,
        c.credential_id,
        b.org_id,
        o.org_name
      FROM credentials c
      JOIN batches b ON c.batch_id = b.batch_id
      JOIN organizations o ON b.org_id = o.org_id
      ORDER BY c.batch_id DESC, c.credential_id
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Get all batches issued on Kirocred (for verifiers)
   * Returns batches with org info and credential count
   */
  async getAllBatches(): Promise<Array<{ batch_id: number; org_id: number; org_name: string | null; credential_count: number }>> {
    const query = `
      SELECT 
        b.batch_id,
        b.org_id,
        o.org_name,
        COUNT(c.credential_id) as credential_count
      FROM batches b
      JOIN organizations o ON b.org_id = o.org_id
      LEFT JOIN credentials c ON b.batch_id = c.batch_id
      GROUP BY b.batch_id, b.org_id, o.org_name
      ORDER BY b.batch_id DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Batch insert for performance
   */
  async insertCredentialsBatch(credentials: Credential[]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO credentials (holder_address, batch_id, ipfs_cid, credential_id)
        VALUES ($1, $2, $3, $4)
      `;
      
      for (const cred of credentials) {
        await client.query(query, [
          cred.holder_address,
          cred.batch_id,
          cred.ipfs_cid,
          cred.credential_id,
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Singleton
let dbInstance: DatabaseClient | null = null;

export async function getDatabase(): Promise<DatabaseClient> {
  if (!dbInstance) {
    dbInstance = new DatabaseClient();
  }
  return dbInstance;
}

export async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
