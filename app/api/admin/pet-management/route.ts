import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

// GET handler to retrieve pet data
export async function GET(request: Request) {
  try {
    // Get wallet address from URL params
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing wallet address' 
      }, { status: 400 });
    }
    
    // Fetch pet data from the database
    const petData = await sql`
      SELECT * FROM pet_states 
      WHERE wallet_address = ${walletAddress}
    `;
    
    if (petData.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pet not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: petData[0]
    });
  } catch (error: any) {
    console.error('Error retrieving pet data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      message: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { walletAddress, operation, health, happiness, hunger, cleanliness, energy, isDead } = data;
    
    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing wallet address' 
      }, { status: 400 });
    }
    
    // Check if the pet exists
    const existingPet = await sql`
      SELECT wallet_address FROM pet_states 
      WHERE wallet_address = ${walletAddress}
    `;
    
    if (existingPet.length === 0) {
      // Pet doesn't exist, create it with default values
      await sql`
        INSERT INTO pet_states (
          wallet_address, health, happiness, hunger, cleanliness,
          energy, is_dead, last_state_update
        ) VALUES (
          ${walletAddress},
          ${health !== undefined ? health : 100},
          ${happiness !== undefined ? happiness : 100},
          ${hunger !== undefined ? hunger : 100},
          ${cleanliness !== undefined ? cleanliness : 100},
          ${energy !== undefined ? energy : 100},
          ${isDead !== undefined ? isDead : false},
          ${new Date().toISOString()}
        )
      `;
      
      return NextResponse.json({ 
        success: true, 
        message: 'New pet state created',
        operation
      }, { status: 201 });
    }
    
    // Pet exists, handle based on operation
    if (operation === 'get') {
      // Get pet data operation
      const petData = await sql`
        SELECT * FROM pet_states 
        WHERE wallet_address = ${walletAddress}
      `;
      
      return NextResponse.json({ 
        success: true, 
        data: petData[0]
      });
    } else if (operation === 'kill') {
      // Kill pet operation
      await sql`
        UPDATE pet_states 
        SET health = 0,
            happiness = 0,
            hunger = 0,
            cleanliness = 0,
            energy = 0,
            is_dead = true,
            last_state_update = ${new Date().toISOString()}
        WHERE wallet_address = ${walletAddress}
      `;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Pet killed successfully' 
      });
    } else if (operation === 'reset') {
      // Reset pet operation
      await sql`
        UPDATE pet_states 
        SET health = 100,
            happiness = 100,
            hunger = 100,
            cleanliness = 100,
            energy = 100,
            is_dead = false,
            last_state_update = ${new Date().toISOString()}
        WHERE wallet_address = ${walletAddress}
      `;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Pet reset successfully' 
      });
    } else {
      // Custom update
      await sql`
        UPDATE pet_states 
        SET health = ${health !== undefined ? health : 'health'},
            happiness = ${happiness !== undefined ? happiness : 'happiness'},
            hunger = ${hunger !== undefined ? hunger : 'hunger'},
            cleanliness = ${cleanliness !== undefined ? cleanliness : 'cleanliness'},
            energy = ${energy !== undefined ? energy : 'energy'},
            is_dead = ${isDead !== undefined ? isDead : 'is_dead'},
            last_state_update = ${new Date().toISOString()}
        WHERE wallet_address = ${walletAddress}
      `;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Pet state updated successfully' 
      });
    }
  } catch (error: any) {
    console.error('Error in pet management API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      message: error.message
    }, { status: 500 });
  }
} 