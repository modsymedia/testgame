import type { NextApiRequest, NextApiResponse } from 'next';
import postgresClient from '@/lib/postgres';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'POST') {
      const { walletAddress, score, petState } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing wallet address' 
        });
      }
      
      try {
        // Check if the user exists
        const existingUserResult = await sql`
          SELECT wallet_address FROM users 
          WHERE wallet_address = ${walletAddress}
        `;
        
        const existingUser = existingUserResult.rows.length > 0 ? existingUserResult.rows[0] : null;
        
        if (existingUser) {
          // Update existing user
          await sql`
            UPDATE users 
            SET points = ${score}, last_points_update = ${new Date().toISOString()}
            WHERE wallet_address = ${walletAddress}
          `;
          
          if (petState) {
            try {
              // Check if pet state exists
              const existingPetResult = await sql`
                SELECT wallet_address FROM pet_states 
                WHERE wallet_address = ${walletAddress}
              `;
              
              const existingPet = existingPetResult.rows.length > 0 ? existingPetResult.rows[0] : null;
              
              if (existingPet) {
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
          // Create new user
          await sql`
            INSERT INTO users (
              wallet_address, points, last_points_update, created_at
            ) VALUES (
              ${walletAddress},
              ${score || 0},
              ${new Date().toISOString()},
              ${new Date().toISOString()}
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
        const userResult = await sql`
          SELECT * FROM users WHERE wallet_address = ${walletAddress}
        `;
        
        if (userResult.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'Wallet not found' 
          });
        }
        
        const user = userResult.rows[0];
        
        // Get pet state if it exists
        let petState = null;
        try {
          const petStateResult = await sql`
            SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
          `;
          
          if (petStateResult.rows.length > 0) {
            petState = petStateResult.rows[0];
          }
        } catch (petError: any) {
          console.error('Error fetching pet state:', petError.message);
          // Continue without pet state
        }
        
        // Format and return user data
        const userData = {
          walletAddress: user.wallet_address,
          points: user.points || 0,
          multiplier: user.multiplier || 1.0,
          lastUpdated: user.last_points_update ? new Date(user.last_points_update) : null,
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
          message: dbError.message 
        });
      }
    } else if (req.method === 'PUT') {
      const { walletAddress, action, amount } = req.body;
      
      if (!walletAddress || !action) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address and action are required'
        });
      }
      
      try {
        if (action === 'burnPoints') {
          // Get current points
          const userResult = await sql`
            SELECT points FROM users WHERE wallet_address = ${walletAddress}
          `;
          
          if (userResult.rows.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'User not found'
            });
          }
          
          const user = userResult.rows[0];
          
          // Calculate remaining points (burn 50%)
          const remainingPoints = Math.floor(user.points * 0.5);
          
          // Update user points
          await sql`
            UPDATE users SET points = ${remainingPoints} 
            WHERE wallet_address = ${walletAddress}
          `;
          
          return res.status(200).json({
            success: true,
            remainingPoints
          });
        }
        
        if (action === 'updatePoints') {
          if (typeof amount !== 'number') {
            return res.status(400).json({
              success: false,
              error: 'Valid amount is required for updatePoints'
            });
          }
          
          // Update user points
          await sql`
            UPDATE users SET points = ${amount} 
            WHERE wallet_address = ${walletAddress}
          `;
          
          return res.status(200).json({
            success: true,
            points: amount
          });
        }
        
        // Unsupported action
        return res.status(400).json({
          success: false,
          error: 'Unsupported action'
        });
      } catch (dbError: any) {
        console.error('Error processing PUT request:', dbError.message);
        
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
    console.error('Unhandled API error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      message: error.message 
    });
  }
} 