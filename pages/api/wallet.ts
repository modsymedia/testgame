import type { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'POST') {
      const { walletAddress, score, petState, username } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing wallet address' 
        });
      }
      
      try {
        // Check if the user exists
        const existingUser = await sql`
          SELECT wallet_address FROM users 
          WHERE wallet_address = ${walletAddress}
        `;
        
        if (existingUser.length > 0) {
          // Update existing user with username
          const updateQuery = username 
            ? sql`
                UPDATE users 
                SET points = ${score}, 
                    last_points_update = ${new Date().toISOString()},
                    username = ${username}
                WHERE wallet_address = ${walletAddress}
              `
            : sql`
                UPDATE users 
                SET points = ${score}, 
                    last_points_update = ${new Date().toISOString()}
                WHERE wallet_address = ${walletAddress}
              `;
              
          await updateQuery;
          
          if (petState) {
            try {
              // Check if pet state exists
              const existingPet = await sql`
                SELECT wallet_address FROM pet_states 
                WHERE wallet_address = ${walletAddress}
              `;
              
              if (existingPet.length > 0) {
                // Update pet state
                await sql`
                  UPDATE pet_states 
                  SET health = ${petState.health},
                      happiness = ${petState.happiness},
                      hunger = ${petState.hunger},
                      cleanliness = ${petState.cleanliness},
                      energy = ${petState.energy},
                      last_state_update = ${new Date().toISOString()},
                      quality_score = ${petState.qualityScore || 0}
                  WHERE wallet_address = ${walletAddress}
                `;
              } else {
                // Insert pet state
                await sql`
                  INSERT INTO pet_states (
                    wallet_address, health, happiness, hunger, cleanliness,
                    energy, last_state_update, quality_score
                  ) VALUES (
                    ${walletAddress},
                    ${petState.health},
                    ${petState.happiness},
                    ${petState.hunger},
                    ${petState.cleanliness},
                    ${petState.energy},
                    ${new Date().toISOString()},
                    ${petState.qualityScore || 0}
                  )
                `;
              }
            } catch (petError: any) {
              console.error('Error updating pet state:', petError.message);
              // Continue execution - don't fail the whole request if just pet state fails
            }
          }
          
          return res.status(200).json({ 
            success: true, 
            message: 'Wallet data updated' 
          });
        } else {
          // Create new user with username
          const defaultUsername = `User_${walletAddress.substring(0, 4)}`;
          await sql`
            INSERT INTO users (
              wallet_address, points, last_points_update, created_at, username
            ) VALUES (
              ${walletAddress},
              ${score || 0},
              ${new Date().toISOString()},
              ${new Date().toISOString()},
              ${username || defaultUsername}
            )
          `;
          
          if (petState) {
            try {
              await sql`
                INSERT INTO pet_states (
                  wallet_address, health, happiness, hunger, cleanliness,
                  energy, last_state_update, quality_score
                ) VALUES (
                  ${walletAddress},
                  ${petState.health},
                  ${petState.happiness},
                  ${petState.hunger},
                  ${petState.cleanliness},
                  ${petState.energy},
                  ${new Date().toISOString()},
                  ${petState.qualityScore || 0}
                )
              `;
            } catch (petError: any) {
              console.error('Error creating pet state:', petError.message);
              // Continue execution - don't fail the whole request if just pet state fails
            }
          }
          
          return res.status(201).json({ 
            success: true, 
            message: 'New wallet data created' 
          });
        }
      } catch (dbError: any) {
        console.error('Database update error:', dbError.message);
        
        return res.status(500).json({ 
          success: false, 
          error: 'Database update error', 
          details: dbError.message 
        });
      }
    } else if (req.method === 'GET') {
      const { walletAddress } = req.query;
      
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing wallet address' 
        });
      }
      
      try {
        // Get user data
        const user = await sql`
          SELECT * FROM users WHERE wallet_address = ${walletAddress}
        `;
        
        if (user.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'Wallet not found' 
          });
        }
        
        // Get pet state if it exists
        let petState = null;
        try {
          const petStateResult = await sql`
            SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
          `;
          
          if (petStateResult.length > 0) {
            petState = petStateResult[0];
          }
        } catch (petError: any) {
          console.error('Error fetching pet state:', petError.message);
          // Continue without pet state
        }
        
        // Format and return user data
        const userData = {
          walletAddress: user[0].wallet_address,
          username: user[0].username || `User_${walletAddress.substring(0, 4)}`,
          points: user[0].points || 0,
          multiplier: user[0].multiplier || 1.0,
          lastUpdated: user[0].last_points_update ? new Date(user[0].last_points_update) : null,
          petState: petState ? {
            health: petState.health,
            happiness: petState.happiness,
            hunger: petState.hunger,
            cleanliness: petState.cleanliness,
            energy: petState.energy,
            lastStateUpdate: petState.last_state_update ? new Date(petState.last_state_update) : null,
            qualityScore: petState.quality_score || 0
          } : null
        };
        
        return res.status(200).json({ 
          success: true, 
          data: userData 
        });
      } catch (dbError: any) {
        console.error('Database query error:', dbError.message);
        
        return res.status(500).json({ 
          success: false, 
          error: 'Server error', 
          details: dbError.message 
        });
      }
    } else if (req.method === 'PUT') {
      const { walletAddress, action, username } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing wallet address' 
        });
      }
      
      try {
        // Check if the user exists
        const existingUser = await sql`
          SELECT * FROM users WHERE wallet_address = ${walletAddress}
        `;
        
        if (existingUser.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'Wallet not found' 
          });
        }
        
        // Handle update actions
        if (action === 'setUsername' && username) {
          await sql`
            UPDATE users 
            SET username = ${username}
            WHERE wallet_address = ${walletAddress}
          `;
          
          return res.status(200).json({ 
            success: true, 
            message: 'Username updated' 
          });
        } else {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid action or missing parameters' 
          });
        }
      } catch (dbError: any) {
        console.error('Database update error:', dbError.message);
        
        return res.status(500).json({ 
          success: false, 
          error: 'Database update error', 
          details: dbError.message 
        });
      }
    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }
  } catch (error: any) {
    console.error('Server error:', error.message);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      details: error.message 
    });
  }
} 