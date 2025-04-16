import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

// Define types for API request
interface ActivityRequest {
  // walletAddress: string; // Old
  uid: string; // New: Expect uid instead
  activity: {
    id: string;
    type: string;
    name: string;
    points: number;
    timestamp: number;
  };
}

// Handle API requests
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract data from request
  // const { walletAddress, activity } = req.body as ActivityRequest; // Old
  const { uid, activity } = req.body as ActivityRequest; // New: Extract uid

  // Validate inputs
  // if (!walletAddress) { // Old
  //   return res.status(400).json({ error: 'Wallet address is required' }); // Old
  // } // Old
  if (!uid) { // New: Validate uid
    return res.status(400).json({ error: 'User ID (uid) is required' }); // New
  }

  if (!activity || !activity.id || !activity.type || !activity.name) {
    return res.status(400).json({ error: 'Invalid activity data' });
  }

  try {
    // Generate a UUID if not provided
    const activityId = activity.id || uuidv4();

    // Check if table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'user_activities'
      );
    `;
    
    const tableExists = tableCheck.rows[0]?.exists === true;
    
    if (!tableExists) {
      console.warn("User activities table does not exist yet. Creating table...");
      // Try to create the table - Ensure uid is NOT NULL here too
      await sql`
        CREATE TABLE IF NOT EXISTS user_activities (
          id SERIAL PRIMARY KEY,
          uid TEXT NOT NULL, -- Use uid column, ensure NOT NULL
          activity_id TEXT UNIQUE NOT NULL,
          activity_type TEXT NOT NULL,
          name TEXT NOT NULL,
          points INTEGER DEFAULT 0,
          timestamp TIMESTAMP NOT NULL
        );
      `;
      // Add index for faster querying by uid
      await sql`CREATE INDEX IF NOT EXISTS idx_user_activities_uid ON user_activities(uid);`;
      console.log("User activities table created successfully from API");
    } else {
      // Table exists - check for migration needs
      console.log("User activities table exists. Checking if migration is needed...");
      
      // Check if wallet_address column exists and uid column exists
      const columnsCheck = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE column_name = 'wallet_address') AS has_wallet,
          COUNT(*) FILTER (WHERE column_name = 'uid') AS has_uid
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'user_activities';
      `;
      
      const hasWalletColumn = parseInt(columnsCheck.rows[0]?.has_wallet || '0') > 0;
      const hasUidColumn = parseInt(columnsCheck.rows[0]?.has_uid || '0') > 0;
      
      // Perform migration if needed
      if (hasWalletColumn) {
        console.log("Found wallet_address column. Migration needed.");
        
        // Add uid column if it doesn't exist yet
        if (!hasUidColumn) {
          console.log("Adding uid column...");
          await sql`ALTER TABLE user_activities ADD COLUMN uid TEXT;`;
        }
        
        // Make wallet_address nullable to avoid constraint errors during transition
        try {
          console.log("Making wallet_address nullable...");
          await sql`ALTER TABLE user_activities ALTER COLUMN wallet_address DROP NOT NULL;`;
        } catch (alterError) {
          console.error("Error making wallet_address nullable:", alterError);
          // Continue anyway - we'll try to work with it
        }
        
        // Try to set up a migration for existing records before altering the schema further
        // This is a temporary solution since we need uid for new records
        try {
          // For this insert, we'll handle the missing uid by using the wallet_address temporarily
          // This ensures newer code works while we migrate
          console.log("Setting query to use wallet_address as fallback...");
        } catch (migrationError) {
          console.error("Error in migration preparation:", migrationError);
        }
      }
    }

    // Execute the query - use the sql template directly
    try {
      await sql`
        INSERT INTO user_activities (
          uid, -- New: Insert uid
          activity_id, 
          activity_type, 
          name, 
          points, 
          timestamp
        ) VALUES (
          ${uid}, -- New: Use uid value
          ${activityId}, 
          ${activity.type}, 
          ${activity.name}, 
          ${activity.points || 0}, 
          to_timestamp(${activity.timestamp ? activity.timestamp / 1000 : Date.now() / 1000})
        )
        ON CONFLICT (activity_id) 
        DO NOTHING
      `;
    } catch (insertError) {
      // If the insert fails with a wallet_address constraint error, try a workaround
      if (insertError instanceof Error && 
          insertError.message?.includes('wallet_address') && 
          insertError.message?.includes('violates not-null constraint')) {
        console.log("Detected wallet_address constraint issue. Attempting alternative insert...");
        
        // Try inserting with both uid and a dummy wallet_address value
        await sql`
          INSERT INTO user_activities (
            wallet_address,
            uid,
            activity_id, 
            activity_type, 
            name, 
            points, 
            timestamp
          ) VALUES (
            'migrated_to_uid', -- Dummy value to satisfy NOT NULL constraint
            ${uid},
            ${activityId}, 
            ${activity.type}, 
            ${activity.name}, 
            ${activity.points || 0}, 
            to_timestamp(${activity.timestamp ? activity.timestamp / 1000 : Date.now() / 1000})
          )
          ON CONFLICT (activity_id) 
          DO NOTHING
        `;
        
        console.log("Successfully inserted with workaround. Consider running a full migration.");
      } else {
        // If it's some other error, rethrow it
        throw insertError;
      }
    }

    // Return success
    return res.status(200).json({ 
      success: true,
      message: 'Activity saved successfully',
      activityId
    });
  } catch (error: any) {
    console.error('Error saving user activity:', error);

    // Check for table/column not existing
    if (error.message?.includes('relation "user_activities" does not exist')) {
      return res.status(500).json({ 
        error: 'Database schema error',
        message: 'The user_activities table does not exist. Please run database migrations.',
        details: error.message
      });
    }

    return res.status(500).json({ 
      error: 'Database error',
      message: 'Failed to save activity',
      details: error.message
    });
  }
} 