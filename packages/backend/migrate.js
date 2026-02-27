const fs = require('fs');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL not found in environment variables");
}

const useSSL = connectionString.includes('render.com');

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined
});

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');
  
  try {
    const files = fs.readdirSync('./migrations');
    const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
    
    if (sqlFiles.length === 0) {
      console.log('⚠️  No migration files found');
      await pool.end();
      return;
    }
    
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(`./migrations/${file}`, 'utf8');
      await pool.query(sql);
      console.log(`✅ Executed: ${file}`);
    }
    
    console.log('\n✨ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
