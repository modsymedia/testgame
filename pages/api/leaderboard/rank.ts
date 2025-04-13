import { NextApiRequest, NextApiResponse } from 'next';
// import { dbService } from '@/lib/database-service'; // Remove dbService import
import { sql } from '@vercel/postgres'; // Ensure sql from vercel/postgres is imported

// Local UserData interface or import needed if used

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  const { wallet } = req.query;
  
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing wallet address' 
    });
  }

  try {
    // Find the user in the database
    const userCheck = await sql`
      SELECT id, wallet_address, username, points, last_points_update 
      FROM users 
      WHERE wallet_address = ${wallet}
    `;

    // If user not found, return success false with appropriate message
    if (userCheck.rows.length === 0) {
      console.log(`User ${wallet} not found in database during rank check.`);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found',
        rank: 0,
        userData: null,
        totalUsers: 0
      });
    }
    
    const dbUser = userCheck.rows[0];
    const userScore = dbUser.points || 0;

    // Fetch pet state directly
    const petStateCheck = await sql`
      SELECT * FROM pet_states
      WHERE wallet_address = ${wallet}
    `;

    // Format pet state or use defaults if not found
    const petState = petStateCheck.rows.length > 0 ? {
      health: petStateCheck.rows[0].health,
      happiness: petStateCheck.rows[0].happiness,
      hunger: petStateCheck.rows[0].hunger,
      cleanliness: petStateCheck.rows[0].cleanliness,
      energy: petStateCheck.rows[0].energy,
      isDead: petStateCheck.rows[0].is_dead || false,
      qualityScore: petStateCheck.rows[0].quality_score || 0
    } : {
      health: 100, happiness: 100, hunger: 100, cleanliness: 100, energy: 100, isDead: false, qualityScore: 0
    };

    // Calculate rank directly using dense_rank
    const rankResult = await sql`
      WITH user_ranks AS (
        SELECT 
          wallet_address,
          points,
          DENSE_RANK() OVER (ORDER BY points DESC) as dense_rank
        FROM users 
        WHERE points > 0
      )
      SELECT 
        dense_rank,
        (SELECT COUNT(*) FROM users WHERE points > 0) as total_users
      FROM user_ranks
      WHERE wallet_address = ${wallet}
    `;

    // If rank query returns no rows (e.g., user has 0 points), rank is 0
    const rank = rankResult.rows[0]?.dense_rank || 0;
    const totalUsers = rankResult.rows[0]?.total_users || 0;

    // Return the data using DB results
    return res.status(200).json({
      success: true,
      rank,
      totalUsers,
      userData: {
        walletAddress: dbUser.wallet_address,
        username: dbUser.username || `User_${wallet.substring(0, 4)}`, // Use consistent default
        points: userScore,
        lastUpdated: dbUser.last_points_update ? new Date(dbUser.last_points_update).toISOString() : undefined,
        petState
      }
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