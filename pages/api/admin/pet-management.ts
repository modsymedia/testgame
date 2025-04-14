import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

/* Removed unused authentication middleware for now
// Basic authentication middleware
const authenticate = async (req: NextApiRequest): Promise<boolean> => {
  // In a real app, add proper authentication check here
  // For now, just check for presence of an admin token in headers
  const adminToken = req.headers['admin-token'] || req.cookies?.adminToken;
  
  // Simple validation - in production use a proper auth system
  return !!adminToken; // Allow if any token is present
};
*/

// Main handler for the API endpoint
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Ensure tables exist
  try {
    await ensureTables();
  } catch (error: any) {
    console.error('[handler] Error ensuring tables exist:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Database error when ensuring tables exist',
      details: error.message
    });
  }

  // Get the operation type and wallet address
  const { operation, walletAddress } = req.body;

  // Validate required fields
  if (!operation || !walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: operation and walletAddress'
    });
  }

  // Log the operation request
  console.log(`[handler] Pet management API request: ${operation} for wallet ${walletAddress}`);

  // Process the operation
  switch (operation) {
    case 'kill':
      return await killPet(walletAddress, res);
    case 'revive':
      return await revivePet(walletAddress, res);
    case 'reset':
      return await resetPet(walletAddress, res);
    case 'drain':
      return await drainPetStats(walletAddress, res);
    case 'get':
      return await getPetStatus(walletAddress, res);
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid operation type'
      });
  }
}

// Function to ensure tables exist
async function ensureTables() {
  console.log('[ensureTables] Checking and creating tables if needed');
  
  try {
    // Check if pet_states table exists and create if not
    await sql`
      CREATE TABLE IF NOT EXISTS pet_states (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        health INTEGER NOT NULL DEFAULT 100,
        happiness INTEGER NOT NULL DEFAULT 100,
        hunger INTEGER NOT NULL DEFAULT 100,
        cleanliness INTEGER NOT NULL DEFAULT 100,
        energy INTEGER NOT NULL DEFAULT 100,
        is_dead BOOLEAN NOT NULL DEFAULT false,
        last_state_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        quality_score INTEGER NOT NULL DEFAULT 0,
        UNIQUE(wallet_address)
      )
    `;
    console.log('[ensureTables] pet_states table check complete');
    
    // Check if users table exists and create if not
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        username TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_points_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(wallet_address)
      )
    `;
    console.log('[ensureTables] users table check complete');
    
    console.log('[ensureTables] All tables ensured successfully');
  } catch (error) {
    console.error('[ensureTables] Error ensuring tables:', error);
    throw error;
  }
}

// Function to kill a pet
async function killPet(walletAddress: string, res: NextApiResponse) {
  try {
    console.log(`[killPet] Attempting to kill pet for wallet: ${walletAddress}`);
    
    // Check if user exists and create if not
    const userCheck = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userCheck.rows.length === 0) {
      console.log(`[killPet] Creating new user for wallet: ${walletAddress}`);
      // Create user with default values
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
    }
    
    // First check if pet exists
    const petCheck = await sql`
      SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
    `;
    
    console.log(`[killPet] Pet check results: ${petCheck.rows.length} rows found`);
    
    if (petCheck.rows.length === 0) {
      console.log(`[killPet] No pet found for wallet: ${walletAddress}, creating and then killing it`);
      
      // Create a pet first 
      await sql`
        INSERT INTO pet_states (
          wallet_address, health, happiness, hunger, cleanliness,
          energy, last_state_update, quality_score, is_dead
        ) VALUES (
          ${walletAddress}, 0, 0, 0, 0,
          0, ${new Date().toISOString()}, 0, true
        )
      `;
      
      return res.status(200).json({
        success: true,
        message: 'Pet created and killed successfully',
        data: {
          wallet_address: walletAddress,
          health: 0,
          happiness: 0,
          hunger: 0,
          cleanliness: 0,
          energy: 0,
          is_dead: true,
          last_state_update: new Date().toISOString()
        }
      });
    }
    
    // Update pet state to dead and set all stats to zero
    console.log(`[killPet] Updating pet state to dead for wallet: ${walletAddress}`);
    const updateResult = await sql`
      UPDATE pet_states 
      SET is_dead = true,
          health = 0,
          happiness = 0,
          hunger = 0,
          cleanliness = 0,
          energy = 0,
          last_state_update = ${new Date().toISOString()}
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `;
    
    console.log(`[killPet] Update result:`, updateResult);
    
    if (updateResult.rowCount === 0) {
      console.error(`[killPet] Update query didn't affect any rows!`);
      return res.status(500).json({
        success: false,
        error: 'Database update failed - no rows affected',
      });
    }
    
    console.log(`[killPet] Pet for wallet ${walletAddress} was killed by admin`);
    
    return res.status(200).json({
      success: true,
      message: 'Pet killed successfully',
      data: updateResult.rows[0]
    });
  } catch (error: any) {
    console.error(`[killPet] Error killing pet:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Database error when killing pet',
      details: error.message
    });
  }
}

// Function to revive a pet
async function revivePet(walletAddress: string, res: NextApiResponse) {
  try {
    console.log(`[revivePet] Attempting to revive pet for wallet: ${walletAddress}`);
    
    // Check if user exists and create if not
    const userCheck = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userCheck.rows.length === 0) {
      console.log(`[revivePet] Creating new user for wallet: ${walletAddress}`);
      // Create user with default values
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
    }
    
    // First check if pet exists
    const petCheck = await sql`
      SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
    `;
    
    console.log(`[revivePet] Pet check results: ${petCheck.rows.length} rows found`);
    
    if (petCheck.rows.length === 0) {
      console.log(`[revivePet] No pet found for wallet: ${walletAddress}, creating a new healthy pet`);
      
      // Create a new healthy pet
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
        message: 'New pet created with full health',
        data: {
          wallet_address: walletAddress,
          health: 100,
          happiness: 100,
          hunger: 100,
          cleanliness: 100,
          energy: 100,
          is_dead: false,
          last_state_update: new Date().toISOString()
        }
      });
    }
    
    // Update pet state to alive and reset stats
    console.log(`[revivePet] Reviving pet for wallet: ${walletAddress}`);
    const updateResult = await sql`
      UPDATE pet_states 
      SET is_dead = false,
          health = 100,
          happiness = 100,
          hunger = 100,
          cleanliness = 100,
          energy = 100,
          last_state_update = ${new Date().toISOString()}
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `;
    
    console.log(`[revivePet] Update result:`, updateResult);
    
    if (updateResult.rowCount === 0) {
      console.error(`[revivePet] Update query didn't affect any rows!`);
      return res.status(500).json({
        success: false,
        error: 'Database update failed - no rows affected',
      });
    }
    
    console.log(`[revivePet] Pet for wallet ${walletAddress} was revived by admin`);
    
    return res.status(200).json({
      success: true,
      message: 'Pet revived successfully',
      data: updateResult.rows[0]
    });
  } catch (error: any) {
    console.error(`[revivePet] Error reviving pet:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Database error when reviving pet',
      details: error.message
    });
  }
}

// Function to reset a pet's stats
async function resetPet(walletAddress: string, res: NextApiResponse) {
  try {
    console.log(`[resetPet] Attempting to reset pet for wallet: ${walletAddress}`);
    
    // Check if user exists and create if not
    const userCheck = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userCheck.rows.length === 0) {
      console.log(`[resetPet] Creating new user for wallet: ${walletAddress}`);
      // Create user with default values
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
    }
    
    // First check if pet exists
    const petCheck = await sql`
      SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
    `;
    
    console.log(`[resetPet] Pet check results: ${petCheck.rows.length} rows found`);
    
    if (petCheck.rows.length === 0) {
      console.log(`[resetPet] No pet found for wallet: ${walletAddress}, creating a new pet with default stats`);
      
      // Create a new pet with default stats
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
        message: 'New pet created with default stats',
        data: {
          wallet_address: walletAddress,
          health: 100,
          happiness: 100,
          hunger: 100,
          cleanliness: 100,
          energy: 100,
          is_dead: false,
          last_state_update: new Date().toISOString()
        }
      });
    }
    
    // Reset pet state to default values
    console.log(`[resetPet] Resetting pet for wallet: ${walletAddress}`);
    const updateResult = await sql`
      UPDATE pet_states 
      SET health = 100,
          happiness = 100,
          hunger = 100,
          cleanliness = 100,
          energy = 100,
          is_dead = false,
          last_state_update = ${new Date().toISOString()}
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `;
    
    console.log(`[resetPet] Update result:`, updateResult);
    
    if (updateResult.rowCount === 0) {
      console.error(`[resetPet] Update query didn't affect any rows!`);
      return res.status(500).json({
        success: false,
        error: 'Database update failed - no rows affected',
      });
    }
    
    console.log(`[resetPet] Pet for wallet ${walletAddress} was reset by admin`);
    
    return res.status(200).json({
      success: true,
      message: 'Pet stats reset successfully',
      data: updateResult.rows[0]
    });
  } catch (error: any) {
    console.error(`[resetPet] Error resetting pet:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Database error when resetting pet',
      details: error.message
    });
  }
}

// Function to drain a pet's stats to critical levels
async function drainPetStats(walletAddress: string, res: NextApiResponse) {
  try {
    console.log(`[drainPetStats] Attempting to drain pet stats for wallet: ${walletAddress}`);
    
    // Check if user exists and create if not
    const userCheck = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userCheck.rows.length === 0) {
      console.log(`[drainPetStats] Creating new user for wallet: ${walletAddress}`);
      // Create user with default values
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
    }
    
    // First check if pet exists
    const petCheck = await sql`
      SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
    `;
    
    console.log(`[drainPetStats] Pet check results: ${petCheck.rows.length} rows found`);
    
    if (petCheck.rows.length === 0) {
      console.log(`[drainPetStats] No pet found for wallet: ${walletAddress}, creating with minimal stats`);
      
      // Create a pet with critical stats
      await sql`
        INSERT INTO pet_states (
          wallet_address, health, happiness, hunger, cleanliness,
          energy, last_state_update, quality_score, is_dead
        ) VALUES (
          ${walletAddress}, 1, 1, 1, 1,
          1, ${new Date().toISOString()}, 0, false
        )
      `;
      
      return res.status(200).json({
        success: true,
        message: 'Pet created with minimal stats',
        data: {
          wallet_address: walletAddress,
          health: 1,
          happiness: 1,
          hunger: 1,
          cleanliness: 1,
          energy: 1,
          is_dead: false,
          last_state_update: new Date().toISOString()
        }
      });
    }
    
    // Set pet stats to very low values, but keep it alive
    console.log(`[drainPetStats] Draining pet stats for wallet: ${walletAddress}`);
    const updateResult = await sql`
      UPDATE pet_states 
      SET health = 1,
          happiness = 1,
          hunger = 1,
          cleanliness = 1,
          energy = 1,
          is_dead = false,
          last_state_update = ${new Date().toISOString()}
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `;
    
    console.log(`[drainPetStats] Update result:`, updateResult);
    
    if (updateResult.rowCount === 0) {
      console.error(`[drainPetStats] Update query didn't affect any rows!`);
      return res.status(500).json({
        success: false,
        error: 'Database update failed - no rows affected',
      });
    }
    
    console.log(`[drainPetStats] Pet for wallet ${walletAddress} had stats drained by admin`);
    
    return res.status(200).json({
      success: true,
      message: 'Pet stats drained to critical levels',
      data: updateResult.rows[0]
    });
  } catch (error: any) {
    console.error(`[drainPetStats] Error draining pet stats:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Database error when draining pet stats',
      details: error.message
    });
  }
}

// Function to get a pet's status
async function getPetStatus(walletAddress: string, res: NextApiResponse) {
  try {
    console.log(`[getPetStatus] Attempting to get pet status for wallet: ${walletAddress}`);
    
    // Check if pet exists
    const petResult = await sql`
      SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
    `;
    
    console.log(`[getPetStatus] Pet check results: ${petResult.rows.length} rows found`);
    
    if (petResult.rows.length === 0) {
      console.log(`[getPetStatus] No pet found for wallet: ${walletAddress}`);
      return res.status(404).json({
        success: false,
        error: 'Pet not found for this wallet address'
      });
    }
    
    const petData = petResult.rows[0];
    console.log(`[getPetStatus] Pet data retrieved:`, petData);
    
    return res.status(200).json({
      success: true,
      message: 'Pet status retrieved successfully',
      data: {
        health: petData.health,
        happiness: petData.happiness,
        hunger: petData.hunger,
        cleanliness: petData.cleanliness,
        energy: petData.energy,
        is_dead: petData.is_dead,
        last_state_update: petData.last_state_update
      }
    });
  } catch (error: any) {
    console.error(`[getPetStatus] Error getting pet status:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Database error when getting pet status',
      details: error.message
    });
  }
} 