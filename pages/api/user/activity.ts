import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

// Define types for API request
interface ActivityRequest {
  walletAddress: string;
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
  const { walletAddress, activity } = req.body as ActivityRequest;

  // Validate inputs
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
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
      // Try to create the table
      await sql`
        CREATE TABLE IF NOT EXISTS user_activities (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT NOT NULL,
          activity_id TEXT UNIQUE NOT NULL,
          activity_type TEXT NOT NULL,
          name TEXT NOT NULL,
          points INTEGER DEFAULT 0,
          timestamp TIMESTAMP NOT NULL
        );
      `;
      console.log("User activities table created successfully from API");
    }

    // Execute the query - use the sql template directly
    await sql`
      INSERT INTO user_activities (
        wallet_address, 
        activity_id, 
        activity_type, 
        name, 
        points, 
        timestamp
      ) VALUES (
        ${walletAddress}, 
        ${activityId}, 
        ${activity.type}, 
        ${activity.name}, 
        ${activity.points}, 
        to_timestamp(${activity.timestamp / 1000})
      )
    `;

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