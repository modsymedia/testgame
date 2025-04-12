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
      // Try to get schema and all tables referencing the wallet_address
      try {
        // Get all tables with foreign keys to users.wallet_address
        const tablesWithReferences = await sql`
          SELECT
            tc.table_name, kcu.column_name
          FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
          AND kcu.referenced_table_name = 'users'
          AND kcu.referenced_column_name = 'wallet_address'
        `;

        // Delete from all tables with references first
        for (const ref of tablesWithReferences) {
          console.log(`Deleting from ${ref.table_name} where ${ref.column_name} = ${walletAddress}`);
          
          await sql`
            DELETE FROM ${sql(ref.table_name)}
            WHERE ${sql(ref.column_name)} = ${walletAddress}
          `;
        }

        // Finally delete the user
        await sql`
          DELETE FROM users
          WHERE wallet_address = ${walletAddress}
        `;
      } catch (schemaError) {
        console.error("Error querying schema:", schemaError);
        
        // Fallback to direct deletes for known tables
        console.log("Falling back to direct table deletions");
        
        // Delete from user_activities table
        await sql`
          DELETE FROM user_activities
          WHERE wallet_address = ${walletAddress}
        `;
        
        // Delete from pet_states table (has foreign key constraint)
        await sql`
          DELETE FROM pet_states
          WHERE wallet_address = ${walletAddress}
        `;
        
        // Finally delete the user
        await sql`
          DELETE FROM users
          WHERE wallet_address = ${walletAddress}
        `;
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'User account and all related data deleted successfully' 
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