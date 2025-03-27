// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { neon } = require('@neondatabase/serverless');

async function checkDatabase() {
  console.log("Checking database connection...");
  console.log("DATABASE_URL available:", !!process.env.DATABASE_URL);
  
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL found in environment variables");
    return;
  }
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Check connection
    console.log("Testing connection...");
    const testResult = await sql`SELECT 1 as test`;
    console.log("Connection test result:", testResult);
    
    // Check users table schema
    console.log("\nChecking users table schema:");
    const usersColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `;
    
    if (usersColumns.length === 0) {
      console.log("Users table doesn't exist or has no columns");
    } else {
      usersColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Check pet_states table schema
    console.log("\nChecking pet_states table schema:");
    const petStatesColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pet_states'
    `;
    
    if (petStatesColumns.length === 0) {
      console.log("pet_states table doesn't exist or has no columns");
    } else {
      petStatesColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    console.log("\nDatabase check completed successfully!");
  } catch (error) {
    console.error("Error checking database:", error);
  }
}

checkDatabase().catch(console.error); 