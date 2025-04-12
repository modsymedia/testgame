import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres'; // Restore direct sql import
// import { dbService } from '@/lib/database-service'; // Remove dbService import
// import { User } from '@/lib/models'; // Remove User import, use local interface

// Restore the local UserData interface definition
interface UserData { 
  _id: any;
  walletAddress: string;
  username?: string; // Optional fields based on schema/usage
  score?: number;
  gamesPlayed?: number;
  lastPlayed?: Date;
  createdAt?: Date;
  points?: number;
  dailyPoints?: number;
  lastPointsUpdate?: Date;
  daysActive?: number;
  consecutiveDays?: number;
  tokenBalance?: number;
  multiplier?: number;
  petState?: { 
    health: number;
    happiness: number;
    hunger: number;
    cleanliness: number;
    energy: number;
    lastStateUpdate: Date;
    qualityScore: number;
    lastMessage?: string; // Optional based on usage
    lastReaction?: string; // Optional based on usage
    isDead: boolean;
    lastInteractionTime?: Date; // Optional based on usage
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    // Restore original logic: Handle user_data_ prefix separately
    if (walletAddress.includes('user_data_')) {
      // Query a specific table for custom user data (assuming a user_data table)
      const actualWalletAddress = walletAddress.replace('user_data_', '');
      const result = await sql`
        SELECT data FROM user_data 
        WHERE wallet_address = ${actualWalletAddress}
        ORDER BY created_at DESC LIMIT 1
      `; // Adjust table/column names if needed

      if (result.rows.length > 0) {
        return res.status(200).json(result.rows[0].data || {});
      } else {
        return res.status(200).json({}); // Return empty object if no custom data
      }
    } else {
      // Handle regular user data lookup from users table
      const result = await sql`
        SELECT * FROM users WHERE wallet_address = ${walletAddress}
      `;

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const dbUser = result.rows[0];
      
      // Manual conversion from snake_case (DB) to camelCase (Frontend)
      const user: UserData = {
        _id: dbUser.id,
        walletAddress: dbUser.wallet_address,
        username: dbUser.username,
        score: dbUser.score,
        gamesPlayed: dbUser.games_played,
        lastPlayed: dbUser.last_played ? new Date(dbUser.last_played) : undefined,
        createdAt: dbUser.created_at ? new Date(dbUser.created_at) : undefined,
        points: dbUser.points,
        dailyPoints: dbUser.daily_points,
        lastPointsUpdate: dbUser.last_points_update ? new Date(dbUser.last_points_update) : undefined,
        daysActive: dbUser.days_active,
        consecutiveDays: dbUser.consecutive_days,
        tokenBalance: dbUser.token_balance,
        multiplier: dbUser.multiplier,
        // lastInteractionTime, cooldowns etc. can be added if needed by frontend
      };

      // Join pet state
      const petStateResult = await sql`
        SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
      `;

      if (petStateResult.rows.length > 0) {
        const petState = petStateResult.rows[0];
        user.petState = {
          health: petState.health,
          happiness: petState.happiness,
          hunger: petState.hunger,
          cleanliness: petState.cleanliness,
          energy: petState.energy,
          lastStateUpdate: new Date(petState.last_state_update),
          qualityScore: petState.quality_score,
          lastMessage: petState.last_message,
          lastReaction: petState.last_reaction,
          isDead: petState.is_dead,
          lastInteractionTime: petState.last_interaction_time ? new Date(petState.last_interaction_time) : undefined,
        };
      }

      return res.status(200).json(user);
    }

  } catch (error) {
    console.error('Error fetching user data API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 