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
        id SERIAL PRIMARY KEY,
        wallet_address TEXT UNIQUE NOT NULL,
        username TEXT,
        score INTEGER DEFAULT 0,
        last_played TIMESTAMP,
        created_at TIMESTAMP,
        points INTEGER DEFAULT 0,
        daily_points INTEGER DEFAULT 0,
        last_points_update TIMESTAMP,
        days_active INTEGER DEFAULT 0,
        consecutive_days INTEGER DEFAULT 0,
        referral_code TEXT UNIQUE,
        referred_by TEXT,
        referral_count INTEGER DEFAULT 0,
        referral_points INTEGER DEFAULT 0,
        multiplier REAL DEFAULT 1.0
      )
    `;
    console.log("Users table created");

    // Create pet_states table
    await sql`
      CREATE TABLE IF NOT EXISTS pet_states (
        wallet_address TEXT PRIMARY KEY,
        health INTEGER DEFAULT 100,
        happiness INTEGER DEFAULT 100,
        hunger INTEGER DEFAULT 100,
        cleanliness INTEGER DEFAULT 100,
        energy INTEGER DEFAULT 100,
        last_interaction_time TIMESTAMP,
        last_state_update TIMESTAMP,
        quality_score INTEGER DEFAULT 0,
        last_message TEXT,
        last_reaction TEXT,
        is_dead BOOLEAN DEFAULT false,
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
      )
    `;
    console.log("Pet states table created");

    // Create user activities table
    await sql`
      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        activity_id TEXT UNIQUE NOT NULL,
        activity_type TEXT NOT NULL,
        name TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        timestamp TIMESTAMP NOT NULL,
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
      );
    `;
    console.log("User activities table created");

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