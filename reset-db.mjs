import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development.local' });

// Create a SQL client
const sql = neon(process.env.DATABASE_URL || '');

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
  console.log('Starting database schema verification...');
  
  try {
    // List existing tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('Existing tables:', tables.map(t => t.table_name));
    
    // Check if pet_states table exists
    const petStatesExists = tables.some(t => t.table_name === 'pet_states');
    
    if (petStatesExists) {
      console.log('pet_states table already exists');
    } else {
      console.log('pet_states table does not exist, creating...');
      await createPetStatesTable();
    }
    
    console.log('Database schema verification completed');
  } catch (error) {
    console.error('Error during database verification:', error);
  }
}

// Run the main function
main().catch(console.error); 