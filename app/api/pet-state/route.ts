import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

// GET handler to retrieve pet state
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing wallet address'
      }, { status: 400 });
    }
    
    try {
      // First try to get the pet state from the database
      const petStateResult = await sql`
        SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
      `;
      
      if (petStateResult.length > 0) {
        const petState = petStateResult[0];
        
        return NextResponse.json({
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
        
        if (userExists.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'User not found'
          }, { status: 404 });
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
        
        return NextResponse.json({
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
      return NextResponse.json({
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
  } catch (error: any) {
    console.error('Error in pet-state API:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error',
      message: error.message
    }, { status: 500 });
  }
}

// POST handler to update pet state
export async function POST(request: Request) {
  try {
    console.log("Received POST request to /api/pet-state");
    const body = await request.json();
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
      health = body.petState.health || 50;
      happiness = body.petState.happiness || 50;
      hunger = body.petState.hunger || 50;
      cleanliness = body.petState.cleanliness || 50;
      energy = body.petState.energy || 50;
      isDead = body.petState.isDead || false;
    } else {
      console.log("Using top-level properties");
      // Extract from top-level properties
      health = body.health || 50;
      happiness = body.happiness || 50;
      hunger = body.hunger || 50;
      cleanliness = body.cleanliness || 50;
      energy = body.energy || 50;
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
      return NextResponse.json({
        success: false,
        error: 'Missing wallet address'
      }, { status: 400 });
    }
    
    try {
      // Check if user exists
      console.log("Checking if user exists:", walletAddress);
      const userExists = await sql`
        SELECT id FROM users WHERE wallet_address = ${walletAddress}
      `;
      
      if (userExists.length === 0) {
        console.log("Creating new user:", walletAddress);
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
      }
      
      // Upsert pet state
      console.log("Upserting pet state for:", walletAddress);
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
          ${''},
          ${'none'},
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
      
      console.log("Pet state updated successfully");
      return NextResponse.json({
        success: true,
        message: 'Pet state updated successfully'
      });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: dbError.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in pet-state API:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error',
      message: error.message
    }, { status: 500 });
  }
} 