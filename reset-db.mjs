import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development.local' });

// Create a SQL client
const sql = neon(process.env.DATABASE_URL || '');

// Function to drop and recreate the users table
async function resetUsersTable() {
  console.log('Resetting users table...');
  try {
    // Drop the table if it exists (CASCADE to remove dependencies like pet_states foreign key)
    await sql`DROP TABLE IF EXISTS users CASCADE;`;
    console.log('Existing users table dropped.');

    // Create the table with the NOT NULL constraint directly
    await sql`
      CREATE TABLE users (
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
        uid TEXT UNIQUE NOT NULL -- Added NOT NULL directly
      )
    `;
    console.log('Users table created successfully');
    return true;
  } catch (error) {
    console.error('Error resetting users table:', error);
    return false;
  }
}

// Function to drop and recreate the pet_states table
async function resetPetStatesTable() {
  console.log('Resetting pet_states table...');
  try {
    // Drop the table if it exists
    await sql`DROP TABLE IF EXISTS pet_states;`;
    console.log('Existing pet_states table dropped.');

    // Create the table
    await sql`
      CREATE TABLE pet_states (
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
    console.log('Pet states table created successfully');
    return true;
  } catch (error) {
    console.error('Error resetting pet_states table:', error);
    return false;
  }
}

// Main function to run the script
async function main() {
  console.log('Starting database reset...');
  
  try {
    // Reset users table (drop and recreate)
    const usersSuccess = await resetUsersTable();

    // Only reset pet_states if users table was reset successfully
    if (usersSuccess) {
      await resetPetStatesTable();
    } else {
      console.log('Skipping pet_states table reset due to users table error.');
    }
    
    console.log('Database reset completed.');
  } catch (error) {
    console.error('Error during database reset:', error);
  }
}

// Run the main function
main().catch(console.error); 