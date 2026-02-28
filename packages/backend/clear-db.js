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

async function clearDatabase() {
  console.log('🗑️  Clearing database...\n');
  
  try {
    // Drop tables in reverse order of dependencies
    await pool.query('DROP TABLE IF EXISTS credentials CASCADE');
    console.log('✅ Dropped credentials table');
    
    await pool.query('DROP TABLE IF EXISTS batches CASCADE');
    console.log('✅ Dropped batches table');
    
    await pool.query('DROP TABLE IF EXISTS organizations CASCADE');
    console.log('✅ Dropped organizations table');
    
    console.log('\n✨ Database cleared successfully!');
    console.log('💡 Run "npm run migrate" to recreate tables');
  } catch (error) {
    console.error('\n❌ Clear database failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearDatabase();
