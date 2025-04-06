import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { walletAddress, points, operation, multiplier } = data;
    
    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing wallet address' 
      }, { status: 400 });
    }
    
    // Check if the user exists
    const existingUser = await sql`
      SELECT * FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (existingUser.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Get the current points
    const currentPoints = existingUser[0].points || 0;
    
    if (operation === 'add' && points !== undefined) {
      // Add points to user
      const newPoints = currentPoints + points;
      
      await sql`
        UPDATE users 
        SET points = ${newPoints},
            last_points_update = ${new Date().toISOString()}
        WHERE wallet_address = ${walletAddress}
      `;
      
      return NextResponse.json({ 
        success: true, 
        message: `${points >= 0 ? 'Added' : 'Removed'} ${Math.abs(points)} points`,
        newTotal: newPoints
      });
    } else if (operation === 'set' && points !== undefined) {
      // Set points to specific value
      await sql`
        UPDATE users 
        SET points = ${points},
            last_points_update = ${new Date().toISOString()}
        WHERE wallet_address = ${walletAddress}
      `;
      
      return NextResponse.json({ 
        success: true, 
        message: `Set points to ${points}`,
        newTotal: points
      });
    } else if (operation === 'setMultiplier' && multiplier !== undefined) {
      // Set points multiplier
      await sql`
        UPDATE users 
        SET multiplier = ${multiplier}
        WHERE wallet_address = ${walletAddress}
      `;
      
      return NextResponse.json({ 
        success: true, 
        message: `Set multiplier to ${multiplier}`,
        multiplier
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid operation' 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in user points API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      message: error.message 
    }, { status: 500 });
  }
} 