import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/clientPromise';
import { LeaderboardEntry, User } from '@/lib/models';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Define a type for the users collection to match the methods we need
interface UsersCollection {
  findOne: (filter: any) => Promise<User | null>;
  insertOne: (doc: any) => Promise<{ insertedId: number | undefined }>;
  updateOne: (filter: any, update: any) => Promise<{ modifiedCount: number }>;
  find: (filter?: any) => Promise<{
    sort: (sortSpec: any) => any;
    limit: (n: number) => any;
    toArray: () => Promise<User[]>;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Initial safety check
  try {
    // Set CORS headers to allow frontend to access this API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    try {
      // Get the SQLite client
      const client = await clientPromise;
      // Use type assertion to ensure TypeScript understands the collection's capabilities
      const collection = client.collection('users') as unknown as UsersCollection;

      if (req.method === 'GET') {
        // Get top players for leaderboard
        const limit = parseInt(req.query.limit as string) || 10;
        
        // Use the find method which returns a cursor-like object
        const cursor = await collection.find();
        const users = await cursor
          .sort({ score: -1 })
          .limit(limit)
          .toArray();
        
        // Format the response as leaderboard entries with rankings
        const leaderboard: LeaderboardEntry[] = users.map((user: User, index: number) => ({
          walletAddress: user.walletAddress || 'unknown',
          username: user.username || (user.walletAddress ? user.walletAddress.substring(0, 6) + '...' : 'Unknown'),
          score: typeof user.score === 'number' ? user.score : 0,
          rank: index + 1
        }));
        
        return res.status(200).json({ leaderboard, source: 'sqlite' });
      } 
      else if (req.method === 'POST') {
        // Update user score
        const { walletAddress, score } = req.body;
        
        if (!walletAddress || typeof score !== 'number') {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields',
            source: 'validation'
          });
        }
        
        try {
          // Ensure data directory exists
          const DATA_DIR = path.join(process.cwd(), 'data');
          if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
          }
          
          const DB_PATH = path.join(DATA_DIR, 'game.db');
          
          // Use direct SQLite connection for this operation
          const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
          });
          
          // Check if user exists
          const user = await db.get('SELECT * FROM users WHERE walletAddress = ?', walletAddress);
          const now = new Date().toISOString();
          
          if (!user) {
            // Insert new user
            await db.run(`
              INSERT INTO users (walletAddress, score, gamesPlayed, lastPlayed, createdAt)
              VALUES (?, ?, ?, ?, ?)
            `, [walletAddress, score, 1, now, now]);
            
            return res.status(200).json({ success: true, updated: true, source: 'sqlite-direct' });
          } else {
            // Update user
            if (score > (user.score || 0)) {
              // Update score if higher
              await db.run(`
                UPDATE users SET score = ?, lastPlayed = ? WHERE walletAddress = ?
              `, [score, now, walletAddress]);
              
              return res.status(200).json({ success: true, updated: true, source: 'sqlite-direct' });
            } else {
              // Just update last played time
              await db.run(`
                UPDATE users SET lastPlayed = ? WHERE walletAddress = ?
              `, [now, walletAddress]);
              
              return res.status(200).json({ success: true, updated: false, source: 'sqlite-direct' });
            }
          }
        } catch (updateError) {
          console.error('Error updating user score:', updateError);
          return res.status(503).json({ 
            success: false, 
            updated: false, 
            error: updateError instanceof Error ? updateError.message : 'Database update error'
          });
        }
      }
      
      // Handle unsupported methods
      return res.status(405).json({ error: 'Method not allowed' });
      
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      
      if (req.method === 'GET') {
        return res.status(503).json({ 
          leaderboard: [], 
          error: dbError instanceof Error ? dbError.message : 'Database error'
        });
      } else if (req.method === 'POST') {
        return res.status(503).json({ 
          success: false, 
          error: dbError instanceof Error ? dbError.message : 'Database error'
        });
      }
      
      // Catch-all for other methods
      return res.status(405).json({ 
        error: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Leaderboard API critical error:', error);
    
    return res.status(500).json({ 
      error: 'Server error', 
      message: error instanceof Error ? error.message : String(error),
      leaderboard: []
    });
  }
} 