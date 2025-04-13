import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

// Ensure the pet_states table exists
async function ensureTables() {
  try {
    // Create users table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_points_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        days_active INTEGER NOT NULL DEFAULT 1,
        consecutive_days INTEGER NOT NULL DEFAULT 1,
        multiplier FLOAT NOT NULL DEFAULT 1.0
      )
    `;
    
    // Create pet_states table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS pet_states (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT UNIQUE NOT NULL,
        health INTEGER NOT NULL DEFAULT 50,
        happiness INTEGER NOT NULL DEFAULT 50,
        hunger INTEGER NOT NULL DEFAULT 50,
        cleanliness INTEGER NOT NULL DEFAULT 50,
        energy INTEGER NOT NULL DEFAULT 50,
        is_dead BOOLEAN NOT NULL DEFAULT false,
        quality_score INTEGER NOT NULL DEFAULT 0,
        last_state_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_message TEXT,
        last_reaction TEXT
      )
    `;
    
    console.log("Database tables initialized");
    return true;
  } catch (error) {
    console.error("Error ensuring tables exist:", error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure tables exist first
  await ensureTables();
  
  try {
    // Handle GET request - retrieve pet state
    if (req.method === 'GET') {
      const { walletAddress } = req.query;
      
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing wallet address'
        });
      }
      
      try {
        // First try to get the pet state from the database
        const petStateResult = await sql`
          SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
        `;
        
        if (petStateResult.rows.length > 0) {
          const petState = petStateResult.rows[0];
          
          return res.status(200).json({
            success: true,
            data: {
              health: petState.health,
              happiness: petState.happiness,
              hunger: petState.hunger,
              cleanliness: petState.cleanliness,
              energy: petState.energy,
              isDead: petState.is_dead,
              lastStateUpdate: petState.last_state_update,
              qualityScore: petState.quality_score
            }
          });
        } else {
          // Check if the user exists
          const userExists = await sql`
            SELECT id FROM users WHERE wallet_address = ${walletAddress}
          `;
          
          if (userExists.rows.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'User not found'
            });
          }
          
          // Create a default pet state
          await sql`
            INSERT INTO pet_states (
              wallet_address, health, happiness, hunger, cleanliness,
              energy, last_state_update, quality_score, is_dead
            ) VALUES (
              ${walletAddress}, 100, 100, 100, 100,
              100, ${new Date().toISOString()}, 0, false
            )
          `;
          
          return res.status(200).json({
            success: true,
            data: {
              health: 100,
              happiness: 100,
              hunger: 100,
              cleanliness: 100,
              energy: 100,
              isDead: false,
              lastStateUpdate: new Date().toISOString(),
              qualityScore: 0
            }
          });
        }
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        
        // Return a fallback response with default values
        return res.status(200).json({
          success: true,
          data: {
            health: 50,
            happiness: 50,
            hunger: 50,
            cleanliness: 50,
            energy: 50,
            isDead: false,
            lastStateUpdate: new Date().toISOString(),
            qualityScore: 0
          },
          warning: 'Using default values due to database error'
        });
      }
    } 
    // Handle POST request - update pet state
    else if (req.method === 'POST') {
      const body = req.body;
      console.log("Request body:", JSON.stringify(body));
      
      // Handle both formats: 
      // 1. Direct properties in the body 
      // 2. Properties nested under petState
      const walletAddress = body.walletAddress;
      
      // Check if petState is a nested object
      let health, happiness, hunger, cleanliness, energy, isDead;
      
      if (body.petState) {
        console.log("Found nested petState object");
        // Extract from nested petState object
        health = Math.round(body.petState.health || 50);
        happiness = Math.round(body.petState.happiness || 50);
        hunger = Math.round(body.petState.hunger || 50);
        cleanliness = Math.round(body.petState.cleanliness || 50);
        energy = Math.round(body.petState.energy || 50);
        isDead = body.petState.isDead || false;
      } else {
        console.log("Using top-level properties");
        // Extract from top-level properties
        health = Math.round(body.health || 50);
        happiness = Math.round(body.happiness || 50);
        hunger = Math.round(body.hunger || 50);
        cleanliness = Math.round(body.cleanliness || 50);
        energy = Math.round(body.energy || 50);
        isDead = body.isDead || false;
      }
      
      console.log("Extracted values:", {
        walletAddress,
        health,
        happiness,
        hunger,
        cleanliness,
        energy,
        isDead
      });
      
      if (!walletAddress) {
        console.log("Missing wallet address");
        return res.status(400).json({
          success: false,
          error: 'Missing wallet address'
        });
      }
      
      try {
        // Check if user exists
        console.log("Checking if user exists:", walletAddress);
        const userExists = await sql`
          SELECT id FROM users WHERE wallet_address = ${walletAddress}
        `;
        
        if (userExists.rows.length === 0) {
          console.log("Creating new user:", walletAddress);
          try {
            // Create user with default values if not exists
            await sql`
              INSERT INTO users (
                wallet_address, username, points, created_at, last_points_update
              ) VALUES (
                ${walletAddress}, 
                ${'User_' + walletAddress.substring(0, 4)}, 
                0, 
                ${new Date().toISOString()}, 
                ${new Date().toISOString()}
              )
            `;
          } catch (userError: any) {
            console.error("Error creating user:", userError);
            return res.status(500).json({
              success: false,
              error: 'Database error when creating user',
              details: userError.message
            });
          }
        }
        
        // Upsert pet state
        console.log("Upserting pet state for:", walletAddress);
        try {
          await sql`
            INSERT INTO pet_states (
              wallet_address, health, happiness, hunger, cleanliness,
              energy, last_state_update, quality_score, last_message, last_reaction, is_dead
            ) VALUES (
              ${walletAddress}, 
              ${health}, 
              ${happiness}, 
              ${hunger},
              ${cleanliness}, 
              ${energy}, 
              ${new Date().toISOString()},
              ${0}, 
              ${null},
              ${null},
              ${isDead}
            )
            ON CONFLICT (wallet_address)
            DO UPDATE SET
              health = EXCLUDED.health, 
              happiness = EXCLUDED.happiness, 
              hunger = EXCLUDED.hunger,
              cleanliness = EXCLUDED.cleanliness, 
              energy = EXCLUDED.energy, 
              last_state_update = EXCLUDED.last_state_update,
              is_dead = EXCLUDED.is_dead
          `;
        } catch (petError: any) {
          console.error("Error upserting pet state:", petError);
          return res.status(500).json({
            success: false,
            error: 'Database error when updating pet state',
            details: petError.message
          });
        }
        
        console.log("Pet state updated successfully");
        return res.status(200).json({
          success: true,
          message: 'Pet state updated successfully'
        });
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database error',
          details: dbError.message
        });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in pet-state API:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
} 