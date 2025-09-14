import Database from './database.js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  const db = new Database();
  
  try {
    console.log('🚀 Starting database migration...');
    await db.migrate();
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runMigrations();
