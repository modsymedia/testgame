import { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

// Create an in-memory leaderboard cache to improve performance
type LeaderboardEntry = {
  walletAddress: string;
  username: string;
  points: number;
  lastUpdated: Date;
  rank: number;
};

const leaderboardCache: LeaderboardEntry[] = [];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      // Get the limit from query params (default to 10)
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get top scores from database - disable cache since we need accurate pagination
      try {
        // Get total count for pagination
        const countResult = await sql`
          SELECT COUNT(*) as total FROM users WHERE points > 0
        `;
        
        const totalEntries = countResult[0]?.total || 0;
        
        // Get paginated results
        const result = await sql`
          SELECT 
            wallet_address, 
            username, 
            points,
            last_points_update as last_played
          FROM users 
          WHERE points > 0 
          ORDER BY points DESC 
          OFFSET ${offset}
          LIMIT ${limit}
        `;
        
        // Format the response
        const leaderboard = result.map((row, index) => ({
          walletAddress: row.wallet_address,
          username: row.username || `Pet_${row.wallet_address.substring(0, 4)}`,
          points: row.points || 0,
          lastUpdated: row.last_played || new Date(),
          rank: offset + index + 1
        }));
        
        return res.status(200).json({ 
          success: true, 
          data: leaderboard,
          meta: {
            total: totalEntries
          },
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
      const { walletAddress, points, username } = req.body;
      
      if (!walletAddress || points === undefined) {
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
        const currentPoints = userExists ? userResult[0].points : 0;
        
        // Only update if new score is higher
        if (!userExists || points > currentPoints) {
          if (userExists) {
            // Update existing user
            await sql`
              UPDATE users 
              SET points = ${points}, last_points_update = ${new Date().toISOString()} 
              WHERE wallet_address = ${walletAddress}
            `;
          } else {
            // Create new user
            await sql`
              INSERT INTO users (
                wallet_address, points, last_points_update, created_at, username
              ) VALUES (
                ${walletAddress}, 
                ${points}, 
                ${new Date().toISOString()}, 
                ${new Date().toISOString()},
                ${username || `Pet_${walletAddress.substring(0, 4)}`}
              )
            `;
          }
          
          // Clear cache to reflect new data
          leaderboardCache.length = 0;
          
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