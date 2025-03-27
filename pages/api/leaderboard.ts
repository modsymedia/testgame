import { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

// Create an in-memory leaderboard cache to improve performance
type LeaderboardEntry = {
  walletAddress: string;
  username: string;
  score: number;
  lastUpdated: Date;
  rank: number;
};

const leaderboardCache: LeaderboardEntry[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      // Get the limit from query params (default to 10)
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Check if we have a recent cache
      const now = Date.now();
      if (leaderboardCache.length > 0 && now - lastCacheUpdate < CACHE_TTL) {
        // Return the requested number of entries from cache
        return res.status(200).json({ 
          success: true, 
          data: leaderboardCache.slice(0, limit),
          source: 'cache'
        });
      }
      
      // Get top scores from database
      try {
        const result = await sql`
          SELECT 
            wallet_address, 
            username, 
            points as score, 
            last_points_update as last_played
          FROM users 
          WHERE points > 0 
          ORDER BY points DESC 
          LIMIT ${limit}
        `;
        
        // Format the response
        const leaderboard = result.map((row, index) => ({
          walletAddress: row.wallet_address,
          username: row.username || `Pet_${row.wallet_address.substring(0, 4)}`,
          score: row.score || 0,
          lastUpdated: row.last_played || new Date(),
          rank: index + 1
        }));
        
        // Update cache
        leaderboardCache.length = 0;
        leaderboardCache.push(...leaderboard);
        lastCacheUpdate = now;
        
        return res.status(200).json({ 
          success: true, 
          data: leaderboard,
          source: 'postgres'
        });
      } catch (dbError: any) {
        console.error('Database error when retrieving leaderboard:', dbError);
        
        // Return empty leaderboard on error
        return res.status(200).json({ 
          success: true, 
          data: [],
          error: dbError.message,
          source: 'error'
        });
      }
    } else if (req.method === 'POST') {
      const { walletAddress, score, username } = req.body;
      
      if (!walletAddress || score === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }
      
      try {
        // Try to update the database
        const userResult = await sql`
          SELECT points as score, username FROM users 
          WHERE wallet_address = ${walletAddress}
        `;
        
        const userExists = userResult.length > 0;
        const currentScore = userExists ? userResult[0].score : 0;
        
        // Only update if new score is higher
        if (!userExists || score > currentScore) {
          if (userExists) {
            // Update existing user
            await sql`
              UPDATE users 
              SET points = ${score}, last_points_update = ${new Date().toISOString()} 
              WHERE wallet_address = ${walletAddress}
            `;
          } else {
            // Create new user
            await sql`
              INSERT INTO users (
                wallet_address, points, last_points_update, created_at, username
              ) VALUES (
                ${walletAddress}, 
                ${score}, 
                ${new Date().toISOString()}, 
                ${new Date().toISOString()},
                ${username || `Pet_${walletAddress.substring(0, 4)}`}
              )
            `;
          }
          
          // Clear cache to reflect new data
          leaderboardCache.length = 0;
          lastCacheUpdate = 0;
          
          return res.status(200).json({
            success: true,
            message: 'Score updated successfully'
          });
        } else {
          // No update needed
          return res.status(200).json({
            success: true,
            message: 'No update needed (score not higher)'
          });
        }
      } catch (dbError: any) {
        console.error('Error updating user score:', dbError);
        
        return res.status(503).json({
          success: false,
          error: 'Error updating user score',
          details: dbError.message
        });
      }
    } else {
      // Method not allowed
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }
  } catch (error: any) {
    console.error('Unhandled leaderboard API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      message: error.message 
    });
  }
} 