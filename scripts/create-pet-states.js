// Script to create pet_states table if it doesn't exist
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function createPetStatesTable() {
  const sql = neon(process.env.DATABASE_URL || '');
  
  try {
    console.log('Checking if pet_states table exists...');
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pet_states'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.log('Creating pet_states table...');
      await sql`
        CREATE TABLE IF NOT EXISTS pet_states (
          wallet_address TEXT PRIMARY KEY,
          health INTEGER DEFAULT 100,
          happiness INTEGER DEFAULT 100,
          hunger INTEGER DEFAULT 100,
          cleanliness INTEGER DEFAULT 100,
          energy INTEGER DEFAULT 100,
          last_state_update TIMESTAMP,
          quality_score INTEGER DEFAULT 0,
          last_message TEXT,
          last_reaction TEXT,
          is_dead BOOLEAN DEFAULT false,
          last_interaction_time TIMESTAMP,
          version INTEGER DEFAULT 1,
          FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
        );
      `;
      console.log('pet_states table created successfully.');
    } else {
      console.log('pet_states table already exists.');
    }
    
    console.log('Database setup completed.');
  } catch (error) {
    console.error('Error creating pet_states table:', error);
  }
}

createPetStatesTable()
  .then(() => {
    console.log('Script execution completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script execution failed:', err);
    process.exit(1);
  }); 