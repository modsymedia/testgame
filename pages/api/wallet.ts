import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '@/lib/neon';

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
        
        const existingUser = existingUserResult.length > 0 ? existingUserResult[0] : null;
        
        if (existingUser) {
          // Update existing user
          await sql`
            UPDATE users 
            SET points = ${score}, last_updated = NOW()
            WHERE wallet_address = ${walletAddress}
          `;
          
          if (petState) {
            try {
              // Check if pet state exists
              const existingPetResult = await sql`
                SELECT wallet_address FROM pet_states 
                WHERE wallet_address = ${walletAddress}
              `;
              
              const existingPet = existingPetResult.length > 0 ? existingPetResult[0] : null;
              
              if (existingPet) {
                // Update pet state
                await sql`
                  UPDATE pet_states 
                  SET hunger = ${petState.hunger},
                      happiness = ${petState.happiness},
                      energy = ${petState.energy},
                      last_fed = ${petState.lastFed ? new Date(petState.lastFed) : null},
                      last_played = ${petState.lastPlayed ? new Date(petState.lastPlayed) : null},
                      last_slept = ${petState.lastSlept ? new Date(petState.lastSlept) : null},
                      state = ${petState.state || 'idle'}
                  WHERE wallet_address = ${walletAddress}
                `;
              } else {
                // Insert pet state
                await sql`
                  INSERT INTO pet_states (
                    wallet_address, hunger, happiness, energy,
                    last_fed, last_played, last_slept, state
                  ) VALUES (
                    ${walletAddress},
                    ${petState.hunger},
                    ${petState.happiness},
                    ${petState.energy},
                    ${petState.lastFed ? new Date(petState.lastFed) : null},
                    ${petState.lastPlayed ? new Date(petState.lastPlayed) : null},
                    ${petState.lastSlept ? new Date(petState.lastSlept) : null},
                    ${petState.state || 'idle'}
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
              wallet_address, points, last_updated
            ) VALUES (
              ${walletAddress},
              ${score || 0},
              NOW()
            )
          `;
          
          if (petState) {
            try {
              await sql`
                INSERT INTO pet_states (
                  wallet_address, hunger, happiness, energy,
                  last_fed, last_played, last_slept, state
                ) VALUES (
                  ${walletAddress},
                  ${petState.hunger},
                  ${petState.happiness},
                  ${petState.energy},
                  ${petState.lastFed ? new Date(petState.lastFed) : null},
                  ${petState.lastPlayed ? new Date(petState.lastPlayed) : null},
                  ${petState.lastSlept ? new Date(petState.lastSlept) : null},
                  ${petState.state || 'idle'}
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
        
        if (userResult.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'Wallet not found' 
          });
        }
        
        const user = userResult[0];
        
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
          walletAddress: user.wallet_address,
          points: user.points || 0,
          name: user.name || '',
          lastUpdated: user.last_updated ? new Date(user.last_updated) : null,
          petState: petState ? {
            hunger: petState.hunger,
            happiness: petState.happiness,
            energy: petState.energy,
            lastFed: petState.last_fed ? new Date(petState.last_fed) : null,
            lastPlayed: petState.last_played ? new Date(petState.last_played) : null,
            lastSlept: petState.last_slept ? new Date(petState.last_slept) : null,
            state: petState.state || 'idle'
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
          
          if (userResult.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'User not found'
            });
          }
          
          const user = userResult[0];
          
          // Calculate remaining points (burn 50%)
          const remainingPoints = Math.floor(user.points * 0.5);
          
          // Update user points
          await sql`
            UPDATE users SET points = ${remainingPoints}, last_updated = NOW()
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
              error: 'Amount must be a number'
            });
          }
          
          // Get current points
          const userResult = await sql`
            SELECT points FROM users WHERE wallet_address = ${walletAddress}
          `;
          
          if (userResult.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'User not found'
            });
          }
          
          const user = userResult[0];
          const newPoints = Math.max(0, user.points + amount);
          
          // Update user points
          await sql`
            UPDATE users SET points = ${newPoints}, last_updated = NOW()
            WHERE wallet_address = ${walletAddress}
          `;
          
          return res.status(200).json({
            success: true,
            newPoints
          });
        }
        
        return res.status(400).json({
          success: false,
          error: 'Unsupported action'
        });
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
    console.error('API error:', error.message);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      message: error.message 
    });
  }
} 