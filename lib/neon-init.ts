import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

// Create tables if they don't exist
export async function initializeDb() {
  try {
    console.log("Database initialization starting...");
    console.log("Connection URL:", process.env.DATABASE_URL ? "Available" : "Missing");
    
    // Drop existing tables to ensure we have a clean slate (CAUTION: only for development)
    try {
      // Drop the pet_states table first because it has foreign keys
      await sql`DROP TABLE IF EXISTS pet_states`;
      // Then drop the users table
      await sql`DROP TABLE IF EXISTS users`;
      console.log("Existing tables dropped");
    } catch (dropError) {
      console.error("Error dropping tables:", dropError);
    }
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        wallet_address TEXT PRIMARY KEY,
        username TEXT,
        points INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        multiplier REAL DEFAULT 1.0,
        last_points_update TIMESTAMP,
        last_played TIMESTAMP,
        created_at TIMESTAMP
      )
    `;
    console.log("Users table created");

    // Create pet_states table
    await sql`
      CREATE TABLE IF NOT EXISTS pet_states (
        wallet_address TEXT PRIMARY KEY,
        health INTEGER DEFAULT 30,
        happiness INTEGER DEFAULT 40,
        hunger INTEGER DEFAULT 50,
        cleanliness INTEGER DEFAULT 40,
        energy INTEGER DEFAULT 30,
        quality_score INTEGER DEFAULT 0,
        last_state_update TIMESTAMP,
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
      )
    `;
    console.log("Pet states table created");

    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Initialize database on module load
initializeDb().catch(error => {
  console.error("Failed to initialize database:", error);
});

export { sql }; 