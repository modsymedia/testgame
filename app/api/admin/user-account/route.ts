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
      // Delete all wallet-related data from all tables
      
      try {
        // Get all tables in the database
        const tables = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `;
        
        // First collect all relevant tables
        const tableNames = tables.map((t: any) => t.table_name);
        
        console.log("Found tables:", tableNames);
        
        // For each table, check if it has a wallet_address column and if so, delete records
        for (const tableName of tableNames) {
          try {
            // Check if table has wallet_address column
            const columns = await sql`
              SELECT column_name
              FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = ${tableName}
              AND column_name = 'wallet_address'
            `;
            
            if (columns.length > 0) {
              // This table has a wallet_address column, so delete matching rows
              console.log(`Deleting from table: ${tableName}`);
              
              // Skip users table for now (handle it last due to foreign keys)
              if (tableName !== 'users') {
                await sql`
                  DELETE FROM ${sql(tableName)}
                  WHERE wallet_address = ${walletAddress}
                `;
              }
            }
          } catch (tableError) {
            console.error(`Error processing table ${tableName}:`, tableError);
            // Continue with other tables even if one fails
          }
        }
        
        // Finally delete from users table
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