import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { LeaderboardEntry, User } from '@/lib/models';

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
      console.warn('MongoDB not properly configured');
      
      if (req.method === 'GET') {
        return res.status(200).json({ leaderboard: [], source: 'no-db' });
      } 
      else if (req.method === 'POST') {
        return res.status(503).json({ success: false, error: 'Database not configured' });
      }
      
      return res.status(200).json({ error: 'Method not allowed', source: 'no-db' });
    }
    
    // Try to use MongoDB
    try {
      // Safely await the client promise
      const client = await clientPromise;
      
      // Get the database
      const db = client.db('Cluster0');
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