/**
 * Simple script to test that the SQLite implementation works correctly
 * 
 * To run this script:
 * node scripts/test-sqlite.js
 */
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'game.db');

async function run() {
  console.log('SQLite Test Script');
  console.log('-----------------');
  
  try {
    // Open the database
    console.log(`Opening database at ${DB_PATH}...`);
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    // Create a test table
    console.log('Creating test table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        value INTEGER,
        created_at TEXT
      )
    `);
    
    // Insert a test record
    console.log('Inserting test record...');
    const result = await db.run(`
      INSERT INTO test_table (name, value, created_at)
      VALUES (?, ?, ?)
    `, ['test', 123, new Date().toISOString()]);
    
    console.log(`Inserted record with ID: ${result.lastID}`);
    
    // Query the test record
    console.log('Querying test records...');
    const records = await db.all('SELECT * FROM test_table');
    
    console.log('Records found:', records.length);
    console.log('Sample record:', records[0]);
    
    // Close the database
    await db.close();
    
    console.log('\n✅ SQLite test completed successfully!');
    console.log('The database is working correctly.');
  } catch (error) {
    console.error('\n❌ SQLite test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
run(); 