import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { User } from '@/lib/models';

// Define a list of columns we know exist in the actual production database
// This is based on the error message showing games_played doesn't exist
const KNOWN_SAFE_COLUMNS = [
  'wallet_address',
  'username',
  'score',
  'points',
  'multiplier',
  'last_played',
  'created_at',
  'last_points_update',
  'version'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false });
  }
  
  try {
    const { walletAddress, updateData } = req.body;
    
    // Validate input
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Invalid wallet address', success: false });
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
      // Skip certain properties
      if (key === '_id' || key === 'walletAddress' || key === 'petState') return;
      
      // Convert camelCase to snake_case for database
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      // Only include columns we know exist in the database
      if (KNOWN_SAFE_COLUMNS.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        paramIndex++;
        
        // Convert dates to ISO strings
        if (value instanceof Date) {
          values.push(value.toISOString());
        } else if (key === 'cooldowns') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });
    
    // If nothing to update, return early with success
    if (setClauses.length === 0) {
      return res.status(200).json({ message: 'No fields to update', success: true });
    }
    
    // Add wallet address as the last parameter
    values.push(walletAddress);
    
    // Build and execute the SQL query
    const query = `
      UPDATE users 
      SET ${setClauses.join(', ')} 
      WHERE wallet_address = $${values.length}
    `;
    
    await sql.query(query, values);
    
    // Add simplified pet state handling
    if (updateData.petState) {
      try {
        // Check if pet state exists
        const petStateCheck = await sql`
          SELECT COUNT(*) as count FROM pet_states WHERE wallet_address = ${walletAddress}
        `;
        
        const petExists = petStateCheck.rows[0]?.count > 0;
        
        // Use simplified pet state update with minimal columns
        if (petExists) {
          // Update only the essential columns we're confident exist
          const petState = updateData.petState;
          await sql`
            UPDATE pet_states
            SET 
              health = ${petState.health || 100},
              happiness = ${petState.happiness || 100},
              hunger = ${petState.hunger || 100},
              cleanliness = ${petState.cleanliness || 100},
              energy = ${petState.energy || 100},
              last_state_update = ${new Date().toISOString()}
            WHERE wallet_address = ${walletAddress}
          `;
        } else {
          // Insert new pet state with minimal columns
          const petState = updateData.petState;
          await sql`
            INSERT INTO pet_states (
              wallet_address, health, happiness, hunger, cleanliness, energy,
              last_state_update
            ) VALUES (
              ${walletAddress},
              ${petState.health || 100},
              ${petState.happiness || 100},
              ${petState.hunger || 100},
              ${petState.cleanliness || 100},
              ${petState.energy || 100},
              ${new Date().toISOString()}
            )
          `;
        }
      } catch (petError) {
        // Log pet state error but don't fail the whole request
        console.error('Error updating pet state:', petError);
      }
    }
    
    return res.status(200).json({ 
      message: 'User data updated successfully',
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