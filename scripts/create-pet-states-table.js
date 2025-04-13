// Script to create the pet_states table
require('dotenv').config({ path: '../.env.development.local' });
const { sql } = require('@vercel/postgres');

async function createPetStatesTable() {
  try {
    console.log("Creating pet_states table...");
    
    // Create the users table first if it doesn't exist (since pet_states references it)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT UNIQUE NOT NULL,
        username TEXT,
        score INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        last_played TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        points INTEGER DEFAULT 0,
        daily_points INTEGER DEFAULT 0, 
        last_points_update TIMESTAMP,
        days_active INTEGER DEFAULT 0,
        consecutive_days INTEGER DEFAULT 0,
        token_balance INTEGER DEFAULT 0,
        multiplier REAL DEFAULT 1.0,
        last_interaction_time TIMESTAMP,
        cooldowns JSONB DEFAULT '{}'::jsonb,
        recent_point_gain INTEGER DEFAULT 0,
        last_point_gain_time TIMESTAMP,
        uid TEXT UNIQUE NOT NULL
      )
    `;
    
    // Create index on wallet_address for faster lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users (wallet_address)`;
    
    // Create pet_states table
    await sql`
      CREATE TABLE IF NOT EXISTS pet_states (
        wallet_address TEXT PRIMARY KEY,
        health REAL DEFAULT 100,
        happiness REAL DEFAULT 100,
        hunger REAL DEFAULT 100,
        cleanliness REAL DEFAULT 100,
        energy REAL DEFAULT 100,
        last_interaction_time TIMESTAMP,
        last_state_update TIMESTAMP,
        quality_score INTEGER DEFAULT 0,
        last_message TEXT,
        last_reaction TEXT,
        is_dead BOOLEAN DEFAULT false,
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
      )
    `;
    
    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    process.exit();
  }
}

// Run the function
createPetStatesTable(); 