import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/clientPromise';
import { LeaderboardEntry, User } from '@/lib/models';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { getDb } from '@/lib/sqlite';

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

// Create an in-memory leaderboard fallback for read-only environments
const inMemoryLeaderboard = new Map<string, { walletAddress: string, score: number, lastUpdated: Date }>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get database connection (which will fall back to in-memory if needed)
    const db = await getDb();
    
    if (req.method === 'GET') {
      // Get top scores
      const leaderboard = [];
      
      try {
        // Try to get from database first
        const rows = await db.all(`
          SELECT walletAddress, username AS name, score, lastPlayed AS lastUpdated 
          FROM users 
          WHERE score > 0 
          ORDER BY score DESC 
          LIMIT 10
        `);
        
        leaderboard.push(...rows.map(row => ({
          walletAddress: row.walletAddress,
          name: row.name || `Pet_${row.walletAddress.substring(0, 4)}`,
          score: row.score,
          lastUpdated: row.lastUpdated
        })));
      } catch (dbError) {
        console.error('Database error when retrieving leaderboard:', dbError);
        
        // Fall back to in-memory leaderboard
        const memoryEntries = Array.from(inMemoryLeaderboard.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(entry => ({
            walletAddress: entry.walletAddress,
            name: `Pet_${entry.walletAddress.substring(0, 4)}`,
            score: entry.score,
            lastUpdated: entry.lastUpdated
          }));
          
        leaderboard.push(...memoryEntries);
      }
      
      return res.status(200).json({ 
        success: true, 
        data: leaderboard 
      });
    }
    
    if (req.method === 'POST') {
      const { walletAddress, score } = req.body;
      
      if (!walletAddress || score === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }
      
      try {
        // Try to update the database first
        const user = await db.get('SELECT score FROM users WHERE walletAddress = ?', [walletAddress]);
        
        if (user) {
          // Only update if new score is higher
          if (score > user.score) {
            await db.run(`
              UPDATE users 
              SET score = ?, lastPlayed = ? 
              WHERE walletAddress = ?
            `, [score, new Date().toISOString(), walletAddress]);
          }
        } else {
          // Insert new user if they don't exist
          await db.run(`
            INSERT INTO users (walletAddress, score, lastPlayed, createdAt)
            VALUES (?, ?, ?, ?)
          `, [walletAddress, score, new Date().toISOString(), new Date().toISOString()]);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Score updated successfully'
        });
      } catch (dbError: any) {
        console.error('Error updating user score:', dbError);
        
        // If database is read-only, update in-memory leaderboard
        if (dbError.message && dbError.message.includes('SQLITE_READONLY')) {
          // Get current entry or create new one
          const entry = inMemoryLeaderboard.get(walletAddress) || { 
            walletAddress, 
            score: 0, 
            lastUpdated: new Date() 
          };
          
          // Only update if new score is higher
          if (score > entry.score) {
            inMemoryLeaderboard.set(walletAddress, {
              walletAddress,
              score,
              lastUpdated: new Date()
            });
          }
          
          // Return success even though we're using in-memory fallback
          return res.status(200).json({
            success: true,
            message: 'Score updated in temporary storage',
            warning: 'Using in-memory storage due to database permission issues'
          });
        }
        
        // For other errors, return the error
        return res.status(503).json({
          success: false,
          error: 'Error updating user score',
          details: dbError.message
        });
      }
    }
    
    // Method not allowed
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  } catch (error: any) {
    console.error('Unhandled leaderboard API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      message: error.message 
    });
  }
} 