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
    // Get complete user data including username and points
    const userCheck = await sql`
      SELECT wallet_address, username, points, last_points_update 
      FROM users 
      WHERE wallet_address = ${wallet}
    `;

    let userData;
    let userScore = 0;
    
    if (userCheck.length === 0) {
      console.log(`User ${wallet} not found in database, creating new user entry`);
      
      // Create a new user
      try {
        // Create a new user with default values
        await sql`
          INSERT INTO users (
            wallet_address, points, last_points_update, created_at, username
          ) VALUES (
            ${wallet},
            0,
            ${new Date().toISOString()},
            ${new Date().toISOString()},
            ${`Pet_${wallet.substring(0, 4)}`}
          )
        `;
        
        // Now retrieve the newly created user
        const newUser = await sql`
          SELECT wallet_address, username, points, last_points_update 
          FROM users 
          WHERE wallet_address = ${wallet}
        `;
        
        if (newUser.length > 0) {
          userData = newUser[0];
        } else {
          // If we still can't get the user, return a generated one
          userData = {
            wallet_address: wallet,
            username: `Pet_${wallet.substring(0, 4)}`,
            points: 0,
            last_points_update: new Date().toISOString()
          };
        }
      } catch (createError) {
        console.error('Error creating new user:', createError);
        // Return a generated user object as fallback
        userData = {
          wallet_address: wallet,
          username: `Pet_${wallet.substring(0, 4)}`,
          points: 0,
          last_points_update: new Date().toISOString()
        };
      }
    } else {
      userData = userCheck[0];
      userScore = userData.points || 0;
    }

    // Get pet state data if available
    const petStateCheck = await sql`
      SELECT * FROM pet_states
      WHERE wallet_address = ${wallet}
    `;

    // Format the pet state data if it exists
    const petState = petStateCheck.length > 0 ? {
      health: petStateCheck[0].health,
      happiness: petStateCheck[0].happiness,
      hunger: petStateCheck[0].hunger,
      cleanliness: petStateCheck[0].cleanliness,
      energy: petStateCheck[0].energy,
      isDead: petStateCheck[0].is_dead || false,
      qualityScore: petStateCheck[0].quality_score || 0
    } : {
      health: 30,
      happiness: 40,
      hunger: 50, 
      cleanliness: 40,
      energy: 30,
      isDead: false,
      qualityScore: 0
    };

    // Count how many users have more points than this user
    const rankResult = await sql`
      WITH user_ranks AS (
        SELECT 
          wallet_address,
          points,
          ROW_NUMBER() OVER (ORDER BY points DESC) as rank,
          RANK() OVER (ORDER BY points DESC) as dense_rank
        FROM users 
        WHERE points > 0
      )
      SELECT 
        rank,
        dense_rank,
        (SELECT COUNT(*) FROM users WHERE points > 0) as total_users
      FROM user_ranks
      WHERE wallet_address = ${wallet}
    `;

    // Use dense_rank for position (handles ties better)
    const rank = rankResult[0]?.dense_rank || 0;
    const totalUsers = rankResult[0]?.total_users || 0;

    // Return the user's rank, score, and complete data
    return res.status(200).json({
      success: true,
      rank,
      totalUsers,
      userData: {
        walletAddress: userData.wallet_address,
        username: userData.username || `Pet_${wallet.substring(0, 4)}`,
        points: userScore,
        lastUpdated: userData.last_points_update,
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