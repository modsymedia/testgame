import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

// Define the interface for user data
interface UserData {
  _id: any;
  walletAddress: string;
  username: string;
  score: number;
  gamesPlayed: number;
  lastPlayed: Date;
  createdAt: Date;
  points: number;
  dailyPoints: number;
  lastPointsUpdate: Date;
  daysActive: number;
  consecutiveDays: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  referralPoints: number;
  tokenBalance: number;
  multiplier: number;
  petState?: {
    health: number;
    happiness: number;
    hunger: number;
    cleanliness: number;
    energy: number;
    lastStateUpdate: Date;
    qualityScore: number;
    lastMessage: string;
    lastReaction: string;
    isDead: boolean;
    lastInteractionTime: Date;
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
    // Check if this is a custom user data request (starts with user_data_)
    if (walletAddress.includes('user_data_')) {
      // For custom user data, we need to check the database for saved data
      const actualWalletAddress = walletAddress.replace('user_data_', '');
      
      // Query for custom user data
      const result = await sql`
        SELECT * FROM user_data 
        WHERE wallet_address = ${actualWalletAddress}
        ORDER BY created_at DESC LIMIT 1
      `;

      if (result.rows.length > 0) {
        // If data exists, return it
        const userData = result.rows[0];
        // Return the JSON data directly
        return res.status(200).json(userData.data || {});
      } else {
        // No data found, return empty object
        return res.status(200).json({});
      }
    } else {
      // For regular user data
      const result = await sql`
        SELECT * FROM users WHERE wallet_address = ${walletAddress}
      `;

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Convert from database format to frontend format
      const userData = result.rows[0];
      
      // Convert to camelCase and handle dates
      const user: UserData = {
        _id: userData.id,
        walletAddress: userData.wallet_address,
        username: userData.username,
        score: userData.score || 0,
        gamesPlayed: userData.games_played || 0,
        lastPlayed: userData.last_played ? new Date(userData.last_played) : new Date(),
        createdAt: userData.created_at ? new Date(userData.created_at) : new Date(),
        points: userData.points || 0,
        dailyPoints: userData.daily_points || 0,
        lastPointsUpdate: userData.last_points_update ? new Date(userData.last_points_update) : new Date(),
        daysActive: userData.days_active || 0,
        consecutiveDays: userData.consecutive_days || 0,
        referralCode: userData.referral_code || '',
        referredBy: userData.referred_by || undefined,
        referralCount: userData.referral_count || 0,
        referralPoints: userData.referral_points || 0,
        tokenBalance: userData.token_balance || 0,
        multiplier: userData.multiplier || 1.0,
      };

      // Get pet state if it exists
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
          lastInteractionTime: petState.last_interaction_time ? new Date(petState.last_interaction_time) : new Date(),
        };
      }

      return res.status(200).json(user);
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 