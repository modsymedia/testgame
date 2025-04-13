import type { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { dbService } from '@/lib/database-service'; 

const sql = neon(process.env.DATABASE_URL || '');

// DB Row Interfaces
interface UserRow {
  id: number;
  wallet_address: string;
  username?: string;
  points?: number;
  multiplier?: number;
  created_at: Date | string;
  last_points_update?: Date | string | null;
  uid?: string;
}

interface PetStateRow {
  id: number;
  wallet_address: string;
  health: number;
  happiness: number;
  hunger: number;
  cleanliness: number;
  energy: number;
  is_dead: boolean;
  quality_score: number;
  last_state_update: Date | string;
}

// Request Body Pet State Interface
interface RequestPetState {
  health: number;
  happiness: number;
  hunger: number;
  cleanliness: number;
  energy: number;
  qualityScore?: number;
  is_dead?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // --- POST Request ---
    if (req.method === 'POST') {
      const { walletAddress, score, petState, username }: {
        walletAddress: string;
        score?: number;
        petState?: RequestPetState;
        username?: string;
      } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ success: false, error: 'Missing wallet address' });
      }

      try {
        // Use any[] for template literal result type
        const existingUser: any[] = await sql`
          SELECT wallet_address FROM users
          WHERE wallet_address = ${walletAddress}
        `;

        if (existingUser.length > 0) {
          // --- Update Existing User ---
          // Use separate, simple UPDATE statements based on provided data
          if (username !== undefined && score !== undefined) {
            await sql`
              UPDATE users
              SET username = ${username}, points = ${score}, last_points_update = ${new Date().toISOString()}
              WHERE wallet_address = ${walletAddress}
            `;
          } else if (username !== undefined) {
            await sql`
              UPDATE users SET username = ${username} WHERE wallet_address = ${walletAddress}
            `;
          } else if (score !== undefined) {
            await sql`
              UPDATE users
              SET points = ${score}, last_points_update = ${new Date().toISOString()}
              WHERE wallet_address = ${walletAddress}
            `;
          }

          // Upsert Pet State
          if (petState) {
            await sql`
              INSERT INTO pet_states (
                wallet_address, health, happiness, hunger, cleanliness,
                energy, last_state_update, quality_score, is_dead
              ) VALUES (
                ${walletAddress}, ${petState.health}, ${petState.happiness}, ${petState.hunger},
                ${petState.cleanliness}, ${petState.energy}, ${new Date().toISOString()},
                ${petState.qualityScore || 0}, ${petState.is_dead || false}
              )
              ON CONFLICT (wallet_address)
              DO UPDATE SET
                health = EXCLUDED.health, happiness = EXCLUDED.happiness, hunger = EXCLUDED.hunger,
                cleanliness = EXCLUDED.cleanliness, energy = EXCLUDED.energy, last_state_update = EXCLUDED.last_state_update,
                quality_score = EXCLUDED.quality_score, is_dead = EXCLUDED.is_dead
            `;
          }

          return res.status(200).json({ success: true, message: 'Wallet data updated' });

        } else {
          // --- Create New User ---
          const defaultUsername = `User_${walletAddress.substring(0, 4)}`;
          const timestampPart = Date.now().toString(36);
          const randomPart = crypto.randomBytes(4).toString('hex');
          const uid = `${timestampPart}-${randomPart}`; // Generate UID

          // Insert User with UID
          await sql`
            INSERT INTO users (
              wallet_address, points, last_points_update, created_at, username, uid
            ) VALUES (
              ${walletAddress}, ${score || 0}, ${new Date().toISOString()},
              ${new Date().toISOString()}, ${username || defaultUsername}, ${uid}
            )
          `;

          // Insert Pet State if provided
          if (petState) {
            await sql`
              INSERT INTO pet_states (
                wallet_address, health, happiness, hunger, cleanliness,
                energy, last_state_update, quality_score, is_dead
              ) VALUES (
                ${walletAddress}, ${petState.health}, ${petState.happiness}, ${petState.hunger},
                ${petState.cleanliness}, ${petState.energy}, ${new Date().toISOString()},
                ${petState.qualityScore || 0}, ${petState.is_dead || false}
              )
            `;
          }

          // --- Initialize Custom User Data --- 
          try {
              console.log(`Initializing custom user data for new user: ${walletAddress}`);
              await dbService.saveUserData(walletAddress, { 
                  unlockedItems: {}, // Initialize with empty unlocked items
                  // Add any other default custom fields here
              });
              console.log(`Custom user data initialized for: ${walletAddress}`);
          } catch (customDataError: any) {
              // Log the error but don't fail the whole request
              console.error(`Error initializing custom user data for ${walletAddress}:`, customDataError.message);
              // Potentially add a flag to the response or log differently if this is critical
          }
          // --- End Initialize Custom User Data ---

          return res.status(201).json({ // Return UID on creation
            success: true,
            message: 'New wallet data created',
            uid: uid
          });
        }
      } catch (dbError: any) {
        console.error('Database POST error:', dbError.message, dbError.stack);
        return res.status(500).json({ success: false, error: 'Database update error', details: dbError.message });
      }

    // --- GET Request ---
    } else if (req.method === 'GET') {
      const { walletAddress } = req.query;

      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing wallet address' });
      }

      try {
        // Use any[] and type assertion
        const userResult: any[] = await sql`
          SELECT * FROM users WHERE wallet_address = ${walletAddress}
        `;

        if (userResult.length === 0) {
          return res.status(404).json({ success: false, error: 'Wallet not found' });
        }

        const user = userResult[0] as UserRow; // Assert type here

        // Use any[] and type assertion
        let petState: PetStateRow | null = null;
        try {
          const petStateResult: any[] = await sql`
            SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
          `;
          if (petStateResult.length > 0) {
            petState = petStateResult[0] as PetStateRow; // Assert type here
          }
        } catch (petError: any) {
          console.error('Error fetching pet state:', petError.message);
        }

        // Format and return user data including uid
        const userData = {
          uid: user.uid,
          walletAddress: user.wallet_address,
          username: user.username || `User_${walletAddress.substring(0, 4)}`,
          points: user.points || 0,
          multiplier: user.multiplier || 1.0,
          lastUpdated: user.last_points_update ? new Date(user.last_points_update).toISOString() : null,
          petState: petState ? {
            health: petState.health,
            happiness: petState.happiness,
            hunger: petState.hunger,
            cleanliness: petState.cleanliness,
            energy: petState.energy,
            lastStateUpdate: petState.last_state_update ? new Date(petState.last_state_update).toISOString() : null,
            qualityScore: petState.quality_score || 0,
            is_dead: petState.is_dead
          } : null
        };

        return res.status(200).json({ success: true, data: userData });
      } catch (dbError: any) {
        console.error('Database GET error:', dbError.message, dbError.stack);
        return res.status(500).json({ success: false, error: 'Server error', details: dbError.message });
      }

    // --- PUT Request ---
    } else if (req.method === 'PUT') {
      const { walletAddress, action, username, points } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ success: false, error: 'Missing wallet address' });
      }

      try {
        // Use any[] for existence check
        const existingUser: any[] = await sql`
          SELECT id FROM users WHERE wallet_address = ${walletAddress}
        `;

        if (existingUser.length === 0) {
          return res.status(404).json({ success: false, error: 'Wallet not found' });
        }

        if (action === 'updateUsername' && username) {
          await sql`
            UPDATE users SET username = ${username} WHERE wallet_address = ${walletAddress}
          `;
          return res.status(200).json({ success: true, message: 'Username updated' });
        } else if (action === 'updatePoints' && points !== undefined) {
          await sql`
            UPDATE users SET points = ${points}, last_points_update = ${new Date().toISOString()} WHERE wallet_address = ${walletAddress}
          `;
          return res.status(200).json({ success: true, message: 'Points updated' });
        } else {
          return res.status(400).json({ success: false, error: 'Invalid action or missing parameters for PUT request' });
        }
      } catch (dbError: any) {
        console.error('Database PUT error:', dbError.message, dbError.stack);
        return res.status(500).json({ success: false, error: 'Database update error', details: dbError.message });
      }

    // --- Other Methods ---
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('General API error:', error);
    return res.status(500).json({ success: false, error: 'Server error', details: error.message });
  }
} 