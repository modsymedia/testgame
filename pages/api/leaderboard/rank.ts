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
    // Restore original logic: Find user directly
    const userCheck = await sql`
      SELECT id, wallet_address, username, points, last_points_update 
      FROM users 
      WHERE wallet_address = ${wallet}
    `;

    let dbUser;
    let userScore = 0;
    
    if (userCheck.rows.length === 0) {
      console.log(`User ${wallet} not found in database, creating new user entry via API`);
      // Restore original logic: Create user directly if not found
      try {
        const created = new Date().toISOString();
        const defaultUsername = `User_${wallet.substring(0, 4)}`;
        // Use minimal required fields for creation
        await sql`
          INSERT INTO users (
            wallet_address, points, last_points_update, created_at, username
          ) VALUES (
            ${wallet},
            0,
            ${created},
            ${created},
            ${defaultUsername}
          )
          RETURNING id, wallet_address, username, points, last_points_update
        `;
        // Fetch the newly created user again to be sure
        const newUserResult = await sql`
           SELECT id, wallet_address, username, points, last_points_update 
           FROM users 
           WHERE wallet_address = ${wallet}
        `;
        if (newUserResult.rows.length > 0) {
            dbUser = newUserResult.rows[0];
        } else {
             // Fallback if creation failed or wasn't found immediately
             console.error('Failed to retrieve user immediately after creation attempt.');
             return res.status(500).json({ success: false, error: 'Failed to create or retrieve user' });
        }

      } catch (createError) {
        console.error('Error creating new user in rank API:', createError);
        return res.status(500).json({ success: false, error: 'Error creating user' });
      }
    } else {
      dbUser = userCheck.rows[0];
      userScore = dbUser.points || 0;
    }

    // Fetch pet state directly
    const petStateCheck = await sql`
      SELECT * FROM pet_states
      WHERE wallet_address = ${wallet}
    `;

    // Format pet state or use defaults
    const petState = petStateCheck.rows.length > 0 ? {
      health: petStateCheck.rows[0].health,
      happiness: petStateCheck.rows[0].happiness,
      hunger: petStateCheck.rows[0].hunger,
      cleanliness: petStateCheck.rows[0].cleanliness,
      energy: petStateCheck.rows[0].energy,
      isDead: petStateCheck.rows[0].is_dead || false,
      qualityScore: petStateCheck.rows[0].quality_score || 0
    } : { /* Default values if no pet state found */
      health: 100, happiness: 100, hunger: 100, cleanliness: 100, energy: 100, isDead: false, qualityScore: 0
    };

    // Calculate rank directly
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