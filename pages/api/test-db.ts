import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/clientPromise';
import path from 'path';
import fs from 'fs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Check if data directory exists
    const DATA_DIR = path.join(process.cwd(), 'data');
    const DB_PATH = path.join(DATA_DIR, 'game.db');
    const dbExists = fs.existsSync(DB_PATH);
    
    // Get the SQLite client
    const client = await clientPromise;
    
    // Get all available collections
    const availableCollections = ['users', 'rewardPools', 'userRewards'];
    
    return res.status(200).json({ 
      status: 'connected',
      database: 'SQLite',
      databasePath: DB_PATH.replace(process.cwd(), ''),
      databaseExists: dbExists,
      collections: availableCollections,
      message: 'SQLite database connection successful!',
      storageEngine: 'SQLite'
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Failed to connect to the SQLite database',
      error: error instanceof Error ? error.message : String(error),
      tips: [
        'Make sure your SQLite database file exists or can be created',
        'Check that the data directory is writable',
        'Ensure that the SQLite implementation is properly set up',
        'Verify that the required Node.js modules (sqlite and sqlite3) are installed'
      ]
    });
  }
} 