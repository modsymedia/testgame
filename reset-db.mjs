import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development.local' });

// Create a SQL client
const sql = neon(process.env.DATABASE_URL || '');

// Function to create/update the users table
async function manageUsersTable() {
  console.log('Managing users table...');
  try {
    // Ensure the table exists (using the schema from database-schema.ts)
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
        uid TEXT UNIQUE -- Initially allow NULL
      )
    `;
    // Add the NOT NULL constraint separately if the column exists
    await sql`ALTER TABLE users ALTER COLUMN uid SET NOT NULL;`;
    console.log('Users table managed successfully');
    return true;
  } catch (error) {
    // Ignore specific error if column already has NOT NULL
    if (error.message && error.message.includes('uid" is an identity column')) {
        console.log('UID column already configured correctly.');
        return true; 
    } else if (error.message && error.message.includes('column "uid" of relation "users" contains null values')) {
        console.warn('Cannot add NOT NULL constraint to UID as existing rows have NULL. Update existing users manually.');
        return true; // Proceed without adding NOT NULL constraint for now
    }
    console.error('Error managing users table:', error);
    return false;
  }
}

// Function to create the pet_states table
async function createPetStatesTable() {
  console.log('Creating pet_states table...');
  try {
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
    console.log('Pet states table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating pet_states table:', error);
    return false;
  }
}

// Main function to run the script
async function main() {
  console.log('Starting database schema management...');
  
  try {
    // Manage users table (create/add column)
    await manageUsersTable();

    // Manage pet_states table (create)
    await createPetStatesTable();
    
    console.log('Database schema management completed');
  } catch (error) {
    console.error('Error during database management:', error);
  }
}

// Run the main function
main().catch(console.error); 