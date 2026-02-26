import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Organization, Batch, Credential } from './types';

/**
 * Minimal database client for credential discovery
 */
export class DatabaseClient {
  private db: Database.Database;

  constructor(dbPath: string = './kirocred.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize() {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  // Organization operations
  insertOrganization(org: Organization) {
    const stmt = this.db.prepare(`
      INSERT INTO organizations (org_id, org_name)
      VALUES (?, ?)
    `);
    return stmt.run(org.org_id, org.org_name);
  }

  getOrganization(org_id: number): Organization | undefined {
    const stmt = this.db.prepare(`SELECT * FROM organizations WHERE org_id = ?`);
    return stmt.get(org_id) as Organization | undefined;
  }

  // Batch operations
  insertBatch(batch: Batch) {
    const stmt = this.db.prepare(`
      INSERT INTO batches (batch_id, org_id)
      VALUES (?, ?)
    `);
    return stmt.run(batch.batch_id, batch.org_id);
  }

  getBatch(batch_id: number): Batch | undefined {
    const stmt = this.db.prepare(`SELECT * FROM batches WHERE batch_id = ?`);
    return stmt.get(batch_id) as Batch | undefined;
  }

  getBatchesByOrg(org_id: number): Batch[] {
    const stmt = this.db.prepare(`SELECT * FROM batches WHERE org_id = ?`);
    return stmt.all(org_id) as Batch[];
  }

  // Credential operations
  insertCredential(credential: Credential) {
    const stmt = this.db.prepare(`
      INSERT INTO credentials (holder_address, batch_id, ipfs_cid, credential_id)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(
      credential.holder_address,
      credential.batch_id,
      credential.ipfs_cid,
      credential.credential_id
    );
  }

  /**
   * KEY METHOD: Get all credentials for a holder
   * Returns credentials with org info for display
   */
  getCredentialsByHolder(holder_address: string): Array<Credential & { org_id: number; org_name: string | null }> {
    const stmt = this.db.prepare(`
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
      WHERE c.holder_address = ?
    `);
    return stmt.all(holder_address) as Array<Credential & { org_id: number; org_name: string | null }>;
  }

  /**
   * Get all credentials issued on Kirocred (for verifiers)
   * Returns credentials with org and batch info
   */
  getAllCredentials(): Array<Credential & { org_id: number; org_name: string | null }> {
    const stmt = this.db.prepare(`
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
    `);
    return stmt.all() as Array<Credential & { org_id: number; org_name: string | null }>;
  }

  /**
   * Get all batches issued on Kirocred (for verifiers)
   * Returns batches with org info and credential count
   */
  getAllBatches(): Array<{ batch_id: number; org_id: number; org_name: string | null; credential_count: number }> {
    const stmt = this.db.prepare(`
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
    `);
    return stmt.all() as Array<{ batch_id: number; org_id: number; org_name: string | null; credential_count: number }>;
  }

  /**
   * Batch insert for performance
   */
  insertCredentialsBatch(credentials: Credential[]) {
    const stmt = this.db.prepare(`
      INSERT INTO credentials (holder_address, batch_id, ipfs_cid, credential_id)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((creds: Credential[]) => {
      for (const cred of creds) {
        stmt.run(cred.holder_address, cred.batch_id, cred.ipfs_cid, cred.credential_id);
      }
    });

    insertMany(credentials);
  }

  close() {
    this.db.close();
  }
}

// Singleton
let dbInstance: DatabaseClient | null = null;

export function getDatabase(): DatabaseClient {
  if (!dbInstance) {
    const dbPath = process.env.DATABASE_PATH || './kirocred.db';
    dbInstance = new DatabaseClient(dbPath);
  }
  return dbInstance;
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
