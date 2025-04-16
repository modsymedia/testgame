import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';


// Define a list of columns we know exist in the actual production database
// Removed wallet_address as it shouldn't be updated here.
// UID is the primary key and also not updated here.
const KNOWN_SAFE_COLUMNS = [
  // 'wallet_address', // Removed
  'username',
  'score',
  'points',
  'multiplier',
  'last_played',
  'created_at', // Typically not updated, but might be safe?
  'last_points_update',
  'days_active', // Added based on model
  'consecutive_days', // Added based on model
  'token_balance', // Added based on model
  'last_interaction_time', // Added based on model
  'cooldowns', // Added based on model
  'recent_point_gain', // Added based on model
  'last_point_gain_time', // Added based on model
  'has_been_referred', // Added based on model
  'claimed_points', // Added based on model
  'referred_by', // Added based on model
  'unlocked_items', // Added based on model (assuming JSONB)
  'last_online', // Added based on model
  // 'version' // Removed: Column does not exist in DB
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false });
  }
  
  try {
    // Changed: Read uid instead of walletAddress
    const { uid, updateData } = req.body;
    
    // Validate input
    // Changed: Validate uid
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing UID', success: false });
    }
    
    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({ error: 'Invalid update data', success: false });
    }
    
    // Build SET clause and values
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Process each key in updateData
    Object.entries(updateData).forEach(([key, value]) => {
      // Skip certain properties that shouldn't be updated via this general endpoint
      if (key === '_id' || key === 'uid' || key === 'walletAddress' || key === 'petState') return;
      
      // Convert camelCase to snake_case for database
      // Using the mapping approach from dbService for consistency
      const columnMapping: { [key: string]: string } = {
          username: 'username', points: 'points', gamesPlayed: 'games_played',
          lastPlayed: 'last_played', dailyPoints: 'daily_points', lastPointsUpdate: 'last_points_update',
          daysActive: 'days_active', consecutiveDays: 'consecutive_days', tokenBalance: 'token_balance',
          multiplier: 'multiplier', lastInteractionTime: 'last_interaction_time', cooldowns: 'cooldowns',
          recentPointGain: 'recent_point_gain', lastPointGainTime: 'last_point_gain_time',
          version: 'version', hasBeenReferred: 'has_been_referred', claimedPoints: 'claimed_points',
          referredBy: 'referred_by', unlockedItems: 'unlocked_items', lastOnline: 'last_online'
          // score was in original safe columns but not in User model - keep it for now? Or remove?
          // Let's assume score might still be used and keep it if present
          // score: 'score'
      };
      const snakeKey = columnMapping[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase(); // Fallback conversion

      // Only include columns we know exist in the database
      if (KNOWN_SAFE_COLUMNS.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        
        // Convert dates to ISO strings, handle JSON stringification
        if (value instanceof Date) {
          values.push(value.toISOString());
        } else if (snakeKey === 'cooldowns' || snakeKey === 'unlocked_items') {
          // Ensure complex objects are stringified for JSONB
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        } else {
          values.push(value);
        }
        paramIndex++;
      } else {
         console.warn(`API Update: Skipping unknown or unsafe column '${snakeKey}' for update.`);
      }
    });
    
    // If nothing to update, return early with success
    if (setClauses.length === 0 && !updateData.petState) { // Also check petState
      return res.status(200).json({ message: 'No valid fields to update', success: true });
    }
    
    // Only run DB update if there are clauses
    if (setClauses.length > 0) {
      // Add uid as the last parameter for the WHERE clause
      values.push(uid);
      
      // Build and execute the SQL query
      const query = `
        UPDATE users 
        SET ${setClauses.join(', ')} 
        WHERE uid = $${paramIndex} -- Changed: WHERE clause uses uid
      `;
      
      await sql.query(query, values);
    }
    
    // Add simplified pet state handling, using UID
    if (updateData.petState) {
      try {
        // Check if pet state exists using UID
        const petStateCheck = await sql`
          SELECT COUNT(*) as count FROM pet_states WHERE uid = ${uid} -- Changed: WHERE clause uses uid
        `;
        
        const petExists = petStateCheck.rows[0]?.count > 0;
        
        // Use simplified pet state update with minimal columns
        const petState = updateData.petState; // Assume petState structure is validated client-side or use defaults
        const health = petState.health ?? 100;
        const happiness = petState.happiness ?? 100;
        const hunger = petState.hunger ?? 100;
        const cleanliness = petState.cleanliness ?? 100;
        const energy = petState.energy ?? 100;
        const lastStateUpdate = new Date().toISOString();

        if (petExists) {
          // Update existing pet state using UID
          await sql`
            UPDATE pet_states
            SET 
              health = ${health},
              happiness = ${happiness},
              hunger = ${hunger},
              cleanliness = ${cleanliness},
              energy = ${energy},
              last_state_update = ${lastStateUpdate},
              version = COALESCE(version, 0) + 1 -- Increment version on update
            WHERE uid = ${uid} -- Changed: WHERE clause uses uid
          `;
        } else {
          // Insert new pet state using UID
          await sql`
            INSERT INTO pet_states (
              uid, health, happiness, hunger, cleanliness, energy, last_state_update, version
            ) VALUES (
              ${uid}, -- Changed: Use uid
              ${health},
              ${happiness},
              ${hunger},
              ${cleanliness},
              ${energy},
              ${lastStateUpdate},
              1 -- Initial version
            )
            ON CONFLICT (uid) DO UPDATE SET -- Add conflict handling just in case
              health = EXCLUDED.health,
              happiness = EXCLUDED.happiness,
              hunger = EXCLUDED.hunger,
              cleanliness = EXCLUDED.cleanliness,
              energy = EXCLUDED.energy,
              last_state_update = EXCLUDED.last_state_update,
              version = pet_states.version + 1
          `;
        }
      } catch (petError) {
        // Log pet state error but don't fail the whole request
        console.error(`Error updating pet state for UID ${uid}:`, petError);
        // Optionally include a warning in the response
      }
    }
    
    return res.status(200).json({ 
      message: 'User data updated successfully', // Or indicate partial success if pet failed
      success: true
    });
  } catch (error) {
    console.error('Error in update API:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Special handling for column doesn't exist errors
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        // Extract the column name from the error message
        const match = errorMessage.match(/column "([^"]+)" of relation/);
        const columnName = match ? match[1] : 'unknown';
        
        return res.status(500).json({
          error: 'Schema mismatch error',
          message: `Column "${columnName}" doesn't exist in the database. Please update your code.`,
          success: false,
          schemaError: true,
          column: columnName
        });
      }
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: errorMessage,
      success: false
    });
  }
} 