import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development.local' });

async function resetDB() {
  try {
    console.log('Connecting to database...');
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('Getting all table names...');
    const tables = await sql`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `;
    
    console.log('Tables found:', tables.map(t => t.tablename).join(', '));
    
    console.log('Dropping all tables...');
    
    // Disable foreign key constraints while dropping tables
    await sql`SET session_replication_role = 'replica'`;
    
    // Drop each table
    for (const table of tables) {
      try {
        console.log(`Dropping table: ${table.tablename}`);
        await sql`DROP TABLE IF EXISTS ${sql(table.tablename)} CASCADE`;
      } catch (error) {
        console.error(`Error dropping table ${table.tablename}:`, error);
      }
    }
    
    // Re-enable foreign key constraints
    await sql`SET session_replication_role = 'origin'`;
    
    console.log('All tables dropped. Next app will reinitialize the database.');
  } catch (err) {
    console.error('Error resetting database:', err);
  }
}

resetDB(); 