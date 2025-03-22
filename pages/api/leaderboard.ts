import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { LeaderboardEntry, User } from '@/lib/models';
import { MOCK_LEADERBOARD } from '@/lib/mock-data';

// In-memory storage for development/fallback
const inMemoryScores: Record<string, number> = {};

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
    
    // Check if MongoDB URI is properly configured
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('username:password')) {
      console.warn('MongoDB not properly configured, using mock data');
      
      if (req.method === 'GET') {
        return res.status(200).json({ leaderboard: MOCK_LEADERBOARD, source: 'mock' });
      } 
      else if (req.method === 'POST') {
        const { walletAddress, score } = req.body;
        
        if (!walletAddress || typeof score !== 'number') {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Store in memory as fallback
        if (!inMemoryScores[walletAddress] || score > inMemoryScores[walletAddress]) {
          inMemoryScores[walletAddress] = score;
        }
        
        return res.status(200).json({ success: true, updated: true, source: 'memory' });
      }
      
      return res.status(200).json({ error: 'Method not allowed', source: 'mock' });
    }
    
    // Try to use MongoDB
    try {
      // Safely await the client promise
      const client = await clientPromise;
      
      // Get the database
      const db = client.db(process.env.MONGODB_DB || 'gochi-game');
      const collection = db.collection('users');

      if (req.method === 'GET') {
        // Get top players for leaderboard
        const limit = parseInt(req.query.limit as string) || 10;
        
        const users = await collection
          .find({})
          .sort({ score: -1 }) // Sort by highest score
          .limit(limit)
          .toArray();
        
        // Format the response as leaderboard entries with rankings
        const leaderboard: LeaderboardEntry[] = users.map((user: any, index: number) => ({
          walletAddress: user.walletAddress || 'unknown',
          username: user.username || (user.walletAddress ? user.walletAddress.substring(0, 6) + '...' : 'Unknown'),
          score: typeof user.score === 'number' ? user.score : 0,
          rank: index + 1
        }));
        
        return res.status(200).json({ leaderboard, source: 'mongodb' });
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
          // Find or create user document
          const now = new Date();
          const result = await collection.updateOne(
            { walletAddress },
            { 
              $set: { 
                lastPlayed: now,
              },
              $max: { score }, // Only update if new score is higher
              $inc: { gamesPlayed: 1 },
              $setOnInsert: { createdAt: now }
            },
            { upsert: true }
          );
          
          return res.status(200).json({ success: true, updated: result.modifiedCount > 0, source: 'mongodb' });
        } catch (updateError) {
          console.error('Error updating user score:', updateError);
          return res.status(200).json({ 
            success: false, 
            updated: false, 
            source: 'mongodb-error',
            error: updateError instanceof Error ? updateError.message : 'Database update error'
          });
        }
      }
      
      // Handle unsupported methods
      return res.status(200).json({ error: 'Method not allowed', source: 'mongodb' });
      
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      
      // Fall back to mock data if DB operations fail
      if (req.method === 'GET') {
        console.log('Returning mock data due to database error');
        return res.status(200).json({ 
          leaderboard: MOCK_LEADERBOARD, 
          source: 'mock-fallback',
          error: dbError instanceof Error ? dbError.message : 'Database error'
        });
      } else if (req.method === 'POST') {
        console.log('Returning fallback success response due to database error');
        return res.status(200).json({ 
          success: true, 
          updated: false, 
          source: 'mock-fallback',
          error: dbError instanceof Error ? dbError.message : 'Database error'
        });
      }
      
      // Catch-all for other methods
      return res.status(200).json({ 
        error: 'Method not allowed', 
        source: 'mock-fallback',
        message: dbError instanceof Error ? dbError.message : 'Database error'
      });
    }
  } catch (error) {
    console.error('Leaderboard API critical error:', error);
    
    // Ultimate fallback - always return 200 with error details
    return res.status(200).json({ 
      error: 'Server error', 
      message: error instanceof Error ? error.message : String(error),
      source: 'critical-error-fallback',
      leaderboard: MOCK_LEADERBOARD
    });
  }
} 