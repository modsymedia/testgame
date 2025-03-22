/**
 * Utility script to purge all leaderboard data from the database
 * 
 * To run: 
 * 1. Make sure your MongoDB connection is set in .env.local
 * 2. Run: node scripts/purge-leaderboard.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function purgeLeaderboard() {
  // Check for MongoDB connection string
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('username:password')) {
    console.error('⚠️ MongoDB connection string not found or using placeholder.');
    console.error('Please update your .env.local file with a valid MongoDB connection string.');
    process.exit(1);
  }

  console.log('⚠️ This will delete ALL leaderboard data from the database.');
  console.log('Press Ctrl+C to abort (you have 3 seconds)...');
  
  // Simple countdown
  for (let i = 3; i > 0; i--) {
    console.log(`${i}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'gochi-game';
  
  console.log(`Connecting to MongoDB database: ${dbName}`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB server');
    
    const db = client.db(dbName);
    
    // Get count before deletion
    const beforeCount = await db.collection('users').countDocuments();
    console.log(`Users before purge: ${beforeCount}`);
    
    // Clear existing data
    const result = await db.collection('users').deleteMany({});
    console.log(`🧹 Deleted ${result.deletedCount} user records`);
    
    // Verify deletion
    const afterCount = await db.collection('users').countDocuments();
    console.log(`Users after purge: ${afterCount}`);
    
    console.log('✅ Leaderboard purge completed successfully!');
    console.log('To repopulate with sample data, run: node scripts/seed-database.js');
  } catch (error) {
    console.error('❌ Error purging database:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the purge function
purgeLeaderboard()
  .catch(console.error); 