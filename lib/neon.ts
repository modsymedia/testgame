import { neon } from '@neondatabase/serverless';

// Create a SQL tag that uses the DATABASE_URL environment variable
export const sql = neon(process.env.DATABASE_URL || '');

// Initialize database by creating tables if they don't exist
export async function initDb() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        wallet_address TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0,
        name TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create pet_states table
    await sql`
      CREATE TABLE IF NOT EXISTS pet_states (
        wallet_address TEXT PRIMARY KEY,
        hunger INTEGER DEFAULT 50,
        happiness INTEGER DEFAULT 50,
        energy INTEGER DEFAULT 50,
        last_fed TIMESTAMP,
        last_played TIMESTAMP,
        last_slept TIMESTAMP,
        state TEXT DEFAULT 'idle',
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
      )
    `;

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Initialize the database on module import
initDb().catch(console.error);

export default sql; 