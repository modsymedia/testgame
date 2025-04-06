import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { walletAddress, operation } = data;
    
    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing wallet address' 
      }, { status: 400 });
    }
    
    // Check if the user exists
    const existingUser = await sql`
      SELECT wallet_address FROM users 
      WHERE wallet_address = ${walletAddress}
    `;
    
    if (existingUser.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    if (operation === 'delete') {
      // Delete the user's pet state first (foreign key constraint)
      await sql`
        DELETE FROM pet_states
        WHERE wallet_address = ${walletAddress}
      `;
      
      // Delete the user
      await sql`
        DELETE FROM users
        WHERE wallet_address = ${walletAddress}
      `;
      
      return NextResponse.json({ 
        success: true, 
        message: 'User account deleted successfully' 
      });
    } else if (operation === 'update') {
      const { username, email } = data;
      
      if (username) {
        await sql`
          UPDATE users 
          SET username = ${username}
          WHERE wallet_address = ${walletAddress}
        `;
      }
      
      if (email) {
        await sql`
          UPDATE users 
          SET email = ${email}
          WHERE wallet_address = ${walletAddress}
        `;
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'User account updated successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid operation' 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in user account API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      message: error.message 
    }, { status: 500 });
  }
} 