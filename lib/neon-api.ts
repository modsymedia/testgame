import { sql } from './neon-init';

/**
 * User data interface
 */
export interface UserData {
  walletAddress: string;
  username?: string;
  points: number;
  score?: number;
  multiplier?: number;
  lastUpdated?: Date;
  createdAt?: Date;
}

/**
 * Pet state interface
 */
export interface PetState {
  walletAddress: string;
  health: number;
  happiness: number;
  hunger: number;
  cleanliness: number;
  energy: number;
  qualityScore?: number;
  lastStateUpdate?: Date;
}

/**
 * Get user data by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<UserData | null> {
  try {
    const result = await sql`
      SELECT * FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (result.length === 0) return null;
    
    return {
      walletAddress: result[0].wallet_address,
      username: result[0].username,
      points: result[0].points || 0,
      score: result[0].score || 0,
      multiplier: result[0].multiplier || 1.0,
      lastUpdated: result[0].last_points_update,
      createdAt: result[0].created_at
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

/**
 * Get pet state by wallet address
 */
export async function getPetStateByWallet(walletAddress: string): Promise<PetState | null> {
  try {
    const result = await sql`
      SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
    `;
    
    if (result.length === 0) return null;
    
    return {
      walletAddress: result[0].wallet_address,
      health: result[0].health || 30,
      happiness: result[0].happiness || 40,
      hunger: result[0].hunger || 50,
      cleanliness: result[0].cleanliness || 40,
      energy: result[0].energy || 30,
      qualityScore: result[0].quality_score || 0,
      lastStateUpdate: result[0].last_state_update
    };
  } catch (error) {
    console.error('Error getting pet state:', error);
    return null;
  }
}

/**
 * Create or update user data
 */
export async function upsertUser(userData: UserData): Promise<boolean> {
  try {
    const existingUser = await getUserByWallet(userData.walletAddress);
    
    if (existingUser) {
      // Update existing user
      await sql`
        UPDATE users 
        SET 
          points = ${userData.points || existingUser.points},
          score = ${userData.score !== undefined ? userData.score : existingUser.score},
          multiplier = ${userData.multiplier || existingUser.multiplier},
          username = ${userData.username || existingUser.username},
          last_points_update = ${new Date().toISOString()}
        WHERE wallet_address = ${userData.walletAddress}
      `;
    } else {
      // Create new user
      await sql`
        INSERT INTO users (
          wallet_address, 
          username, 
          points, 
          score,
          multiplier,
          last_points_update, 
          created_at
        ) VALUES (
          ${userData.walletAddress},
          ${userData.username || null},
          ${userData.points || 0},
          ${userData.score || 0},
          ${userData.multiplier || 1.0},
          ${new Date().toISOString()},
          ${new Date().toISOString()}
        )
      `;
    }
    
    return true;
  } catch (error) {
    console.error('Error upserting user data:', error);
    return false;
  }
}

/**
 * Create or update pet state
 */
export async function upsertPetState(petState: PetState): Promise<boolean> {
  try {
    const existingPet = await getPetStateByWallet(petState.walletAddress);
    
    if (existingPet) {
      // Update existing pet state
      await sql`
        UPDATE pet_states 
        SET 
          health = ${petState.health},
          happiness = ${petState.happiness},
          hunger = ${petState.hunger},
          cleanliness = ${petState.cleanliness},
          energy = ${petState.energy},
          quality_score = ${petState.qualityScore || 0},
          last_state_update = ${new Date().toISOString()}
        WHERE wallet_address = ${petState.walletAddress}
      `;
    } else {
      // Create new pet state
      await sql`
        INSERT INTO pet_states (
          wallet_address, 
          health, 
          happiness, 
          hunger, 
          cleanliness,
          energy,
          quality_score,
          last_state_update
        ) VALUES (
          ${petState.walletAddress},
          ${petState.health},
          ${petState.happiness},
          ${petState.hunger},
          ${petState.cleanliness},
          ${petState.energy},
          ${petState.qualityScore || 0},
          ${new Date().toISOString()}
        )
      `;
    }
    
    return true;
  } catch (error) {
    console.error('Error upserting pet state:', error);
    return false;
  }
}

/**
 * Get top scores for leaderboard
 */
export async function getLeaderboard(limit = 10): Promise<Array<{walletAddress: string, name: string, score: number, rank: number}>> {
  try {
    const result = await sql`
      SELECT 
        wallet_address, 
        username, 
        score
      FROM users 
      WHERE score > 0 
      ORDER BY score DESC 
      LIMIT ${limit}
    `;
    
    return result.map((row, index) => ({
      walletAddress: row.wallet_address,
      name: row.username || `Pet_${row.wallet_address.substring(0, 4)}`,
      score: row.score || 0,
      rank: index + 1
    }));
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    return [];
  }
}

/**
 * Burn points (reduce by 50%)
 */
export async function burnUserPoints(walletAddress: string): Promise<number> {
  try {
    const user = await getUserByWallet(walletAddress);
    if (!user) return 0;
    
    const remainingPoints = Math.floor(user.points * 0.5);
    
    await sql`
      UPDATE users 
      SET points = ${remainingPoints}
      WHERE wallet_address = ${walletAddress}
    `;
    
    return remainingPoints;
  } catch (error) {
    console.error('Error burning user points:', error);
    return 0;
  }
}

/**
 * Update user points
 */
export async function updateUserPoints(walletAddress: string, amount: number): Promise<number> {
  try {
    const user = await getUserByWallet(walletAddress);
    if (!user) return 0;
    
    const newPoints = Math.max(0, user.points + amount);
    
    await sql`
      UPDATE users 
      SET points = ${newPoints}
      WHERE wallet_address = ${walletAddress}
    `;
    
    return newPoints;
  } catch (error) {
    console.error('Error updating user points:', error);
    return 0;
  }
} 