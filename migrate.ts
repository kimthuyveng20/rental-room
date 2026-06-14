import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import 'dotenv/config';

async function runMigration() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('⏳ Running migrations...');

  try {
    await migrate(db, { migrationsFolder: './src/lib/db/migrations' }); 
    console.log("NODE_ENV =", process.env.NODE_ENV);
console.log("DATABASE_URL =", process.env.DATABASE_URL);
    console.log('✅ Migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed with error details:\n', error);
  } finally {
    await pool.end();
  }
}

runMigration();