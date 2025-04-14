import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

// Create tables if they don't exist
export async function initializeDb() {
  try {
    console.log("Database initialization starting...");
    console.log("Connection URL:", process.env.DATABASE_URL ? "Available" : "Missing");
    
    // Only drop tables in development mode, never in production
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev && process.env.RESET_DB === 'true') {
      // Drop existing tables to ensure we have a clean slate (ONLY in development with explicit flag)
      try {
        // Drop the pet_states table first because it has foreign keys
        await sql`DROP TABLE IF EXISTS pet_states`;
        // Then drop the users table
        await sql`DROP TABLE IF EXISTS users`;
        console.log("Existing tables dropped (development mode)");
      } catch (dropError) {
        console.error("Error dropping tables:", dropError);
      }
    } else {
      console.log("Skipping table drop (production or no RESET_DB flag)");
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
        UID TEXT UNIQUE,
        referred_by TEXT,
        multiplier REAL DEFAULT 1.0
      )
    `;
    console.log("Users table created or verified");

    // Create pet_states table
    await sql`
      CREATE TABLE IF NOT EXISTS pet_states (
        wallet_address TEXT PRIMARY KEY REFERENCES users(wallet_address) ON DELETE CASCADE,
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
        is_dead BOOLEAN DEFAULT false
      )
    `;
    console.log("Pet states table created or verified");

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
    console.log("User activities table created or verified");

    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Initialize database on module load
// Only run auto-init in development with explicit flag
if (process.env.NODE_ENV === 'development' && process.env.AUTO_INIT_DB === 'true') {
  initializeDb().catch(error => {
    console.error("Failed to initialize database:", error);
  });
} else {
  console.log("Skipping automatic database initialization - will be initialized when needed");
}

export { sql }; 