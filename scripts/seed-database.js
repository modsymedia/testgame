/**
 * Database seeding script for the leaderboard
 * 
 * To run: 
 * 1. Make sure your MongoDB connection is set in .env.local
 * 2. Run: node scripts/seed-database.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

// Sample user data defined directly in this file (copied from lib/mock-data.ts)
// to avoid ES module import issues in CommonJS
const SAMPLE_USERS = [
  {
    walletAddress: '8zJ91ufGPmxrJvVyPEW4CNQciLkzCVPVEZX9LovT9i6S',
    username: 'CryptoWhale',
    score: 9850,
    gamesPlayed: 39,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS',
    username: 'SolanaQueen',
    score: 8720,
    gamesPlayed: 35,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: '2xnyzLVZVfjtXRXgXYuMj9AR5BygjxYKVKAaQ4pqZhPC',
    username: 'NFTKing',
    score: 7645,
    gamesPlayed: 30,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: '5Bf8iYXqMT3V8289JmyVCDCJJRNfPzERxRnHiwjQ6tha',
    username: 'BlockchainNinja',
    score: 6230,
    gamesPlayed: 25,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: 'Gq8KNmX4jfM3CPwkwwPQXdembCTBdBFZnZ4GhHKqQHSw',
    username: 'MoonShooter',
    score: 5890,
    gamesPlayed: 23,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: 'AX3iM2BK4tN9SVS8NMwXtM2cEktiJkY9D91D9zPVGNjB',
    username: 'SolGamer',
    score: 4750,
    gamesPlayed: 19,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: '7LvFzto5H9v5yvD84HW8RgdZP3hgDTtGLiRDBwKniedK',
    username: 'Satoshi2023',
    score: 3980,
    gamesPlayed: 16,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: 'DaBL4Lx3r6a1CKAaJMxNsGcZcKiHL7WJUNWoBxzDtJcS',
    username: 'CryptoPunk',
    score: 3540,
    gamesPlayed: 14,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: '9MqQDRvMZwrPAvYk8QoAgD9uttRBB9fHz9GZ5HPeAcXJ',
    username: 'TokenMaster',
    score: 2870,
    gamesPlayed: 11,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: '3rTD7kMTyJjYLQfu6rKiN94jEXNfD7USKDmQzYW7hsXa',
    username: 'AlphaHunter',
    score: 2340,
    gamesPlayed: 9,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: 'GH6NctkRUwtsLTqGbq3LYHxCiRvP1eGz3wYVWa5YH2YV',
    username: 'Web3Developer',
    score: 1950,
    gamesPlayed: 8,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: 'BWh85iNST8bMgSAkZ3Jsr4cYj9W9KfNxwT4m6VzCnKgj',
    username: 'MetaverseExplorer',
    score: 1780,
    gamesPlayed: 7,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: 'J2vGa8N9gCBGcRV3VR3WNQsN6MYL9wBkRz5uTVs8D6To',
    username: 'DAOBuilder',
    score: 1520,
    gamesPlayed: 6,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: 'EdEM1ET6V6Vi3uWpK6Xvwgj6HJKLx3GLnXnJwRXf3VVC',
    username: 'DeFiWizard',
    score: 1340,
    gamesPlayed: 5,
    lastPlayed: new Date(),
    createdAt: new Date()
  },
  {
    walletAddress: 'FWzeZ5j6PUKvNTXRp9QtsQeanQ5UBD8K85ZKMQjRXytA',
    username: 'TokenWhisperer',
    score: 1120,
    gamesPlayed: 4,
    lastPlayed: new Date(),
    createdAt: new Date()
  }
];

async function seedDatabase() {
  // Check for MongoDB connection string
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('username:password')) {
    console.error('MongoDB connection string not found or using placeholder.');
    console.error('Please update your .env.local file with a valid MongoDB connection string.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  const dbName = 'Cluster0';
  
  console.log(`Connecting to MongoDB database: ${dbName}`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB server');
    
    const db = client.db(dbName);
    
    // Clear existing data
    await db.collection('users').deleteMany({});
    console.log('Cleared existing users data');
    
    // Insert sample data
    const result = await db.collection('users').insertMany(SAMPLE_USERS);
    console.log(`Successfully inserted ${result.insertedCount} users into the database`);
    
    // Verify data is inserted
    const count = await db.collection('users').countDocuments();
    console.log(`Total users in database: ${count}`);
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the seeding function
seedDatabase()
  .catch(console.error); 