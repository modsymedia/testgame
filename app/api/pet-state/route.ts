import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

// GET handler to retrieve pet state
export async function GET(request: Request) {
  try {
    // Get wallet address from URL params
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      console.error('Missing wallet address in GET request');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing wallet address' 
      }, { status: 400 });
    }
    
    console.log(`Fetching pet state for wallet: ${walletAddress}`);
    
    // Fetch pet data from the database
    const petData = await sql`
      SELECT * FROM pet_states 
      WHERE wallet_address = ${walletAddress}
    `;
    
    if (!petData || petData.length === 0) {
      console.warn(`Pet not found for wallet: ${walletAddress}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Pet not found' 
      }, { status: 404 });
    }
    
    // Format data for client
    const formattedData = {
      health: petData[0].health || 0,
      happiness: petData[0].happiness || 0,
      hunger: petData[0].hunger || 0,
      cleanliness: petData[0].cleanliness || 0,
      energy: petData[0].energy || 0,
      is_dead: petData[0].is_dead || false,
      last_state_update: petData[0].last_state_update,
      points: petData[0].points || 0
    };
    
    console.log(`Successfully retrieved pet state for wallet: ${walletAddress}`);
    
    return NextResponse.json({ 
      success: true, 
      data: formattedData
    });
  } catch (error: any) {
    console.error('Error retrieving pet state:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST handler to update pet state
export async function POST(request: Request) {
  try {
    // Parse the request body
    const data = await request.json();
    console.log('Received pet state update request:', data);
    
    // Extract and validate required fields
    const { walletAddress, health, happiness, hunger, cleanliness, energy, isDead } = data;
    
    if (!walletAddress) {
      console.error('Missing wallet address in POST request');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing wallet address' 
      }, { status: 400 });
    }
    
    // Validate and sanitize input values
    const validatedHealth = Math.round(typeof health === 'number' ? Math.max(0, Math.min(100, health)) : 100);
    const validatedHappiness = Math.round(typeof happiness === 'number' ? Math.max(0, Math.min(100, happiness)) : 100);
    const validatedHunger = Math.round(typeof hunger === 'number' ? Math.max(0, Math.min(100, hunger)) : 100);
    const validatedCleanliness = Math.round(typeof cleanliness === 'number' ? Math.max(0, Math.min(100, cleanliness)) : 100);
    const validatedEnergy = Math.round(typeof energy === 'number' ? Math.max(0, Math.min(100, energy)) : 100);
    const validatedIsDead = typeof isDead === 'boolean' ? isDead : false;
    
    // Check if the pet exists
    console.log(`Checking if pet exists for wallet: ${walletAddress}`);
    const existingPet = await sql`
      SELECT wallet_address FROM pet_states 
      WHERE wallet_address = ${walletAddress}
    `;
    
    const timestamp = new Date().toISOString();
    
    if (!existingPet || existingPet.length === 0) {
      // Pet doesn't exist, create it with validated values
      console.log(`Creating new pet state for wallet: ${walletAddress}`);
      await sql`
        INSERT INTO pet_states (
          wallet_address, health, happiness, hunger, cleanliness,
          energy, is_dead, last_state_update
        ) VALUES (
          ${walletAddress},
          ${validatedHealth},
          ${validatedHappiness},
          ${validatedHunger},
          ${validatedCleanliness},
          ${validatedEnergy},
          ${validatedIsDead},
          ${timestamp}
        )
      `;
      
      console.log(`Successfully created pet state for wallet: ${walletAddress}`);
      return NextResponse.json({ 
        success: true, 
        message: 'New pet state created',
        timestamp
      }, { status: 201 });
    } else {
      // Pet exists, update its state with validated values
      console.log(`Updating pet state for wallet: ${walletAddress}`);
      await sql`
        UPDATE pet_states 
        SET health = ${validatedHealth},
            happiness = ${validatedHappiness},
            hunger = ${validatedHunger},
            cleanliness = ${validatedCleanliness},
            energy = ${validatedEnergy},
            is_dead = ${validatedIsDead},
            last_state_update = ${timestamp}
        WHERE wallet_address = ${walletAddress}
      `;
      
      console.log(`Successfully updated pet state for wallet: ${walletAddress}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Pet state updated successfully',
        timestamp
      });
    }
  } catch (error: any) {
    console.error('Error updating pet state:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 