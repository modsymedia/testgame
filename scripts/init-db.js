// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { neon } = require('@neondatabase/serverless');

async function initializeDb() {
  console.log("Database initialization starting...");
  console.log("Connection URL:", process.env.DATABASE_URL ? "Available" : "Missing");
  
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL found in environment variables");
    return false;
  }
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Test connection
    console.log("Testing connection...");
    const testResult = await sql`SELECT 1 as test`;
    console.log("Connection test result:", testResult);
    
    // Drop existing tables to ensure we have a clean slate (CAUTION: only for development)
    try {
      // Drop the pet_states table first because it has foreign keys
      await sql`DROP TABLE IF EXISTS pet_states`;
      console.log("pet_states table dropped");
      
      // Then drop the users table
      await sql`DROP TABLE IF EXISTS users`;
      console.log("users table dropped");
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

// Run the database initialization
initializeDb()
  .then(success => {
    if (success) {
      console.log("Database initialization completed successfully");
      
      // Run a check to verify the tables are created correctly
      checkTables();
    } else {
      console.error("Database initialization failed");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Error during database initialization:", error);
    process.exit(1);
  });

async function checkTables() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Check users table schema
    console.log("\nVerifying users table schema:");
    const usersColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `;
    
    usersColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check pet_states table schema
    console.log("\nVerifying pet_states table schema:");
    const petStatesColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pet_states'
    `;
    
    petStatesColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    console.log("\nDatabase verification completed successfully!");
  } catch (error) {
    console.error("Error verifying database:", error);
  }
} 