import { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Get wallet address from query
  const { wallet } = req.query;
  
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing wallet address' 
    });
  }

  try {
    // First check if the user exists in our database
    const userCheck = await sql`
      SELECT points FROM users 
      WHERE wallet_address = ${wallet}
    `;

    if (userCheck.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get the user's score
    const userScore = userCheck[0].points || 0;

    // Count how many users have more points than this user
    const rankResult = await sql`
      SELECT COUNT(*) as higher_rank 
      FROM users 
      WHERE points > ${userScore}
    `;

    // Rank is the count + 1 (since ranks start at 1)
    const rank = (rankResult[0].higher_rank || 0) + 1;

    // Return the user's rank and score
    return res.status(200).json({
      success: true,
      rank,
      score: userScore
    });
  } catch (error: any) {
    console.error('Error getting user rank:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: error.message
    });
  }
} 