import type { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  try {
    const { username } = req.body;
    
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Valid username is required'
      });
    }
    
    // Check if username already exists in the database
    const existingUsers = await sql`
      SELECT username FROM users 
      WHERE LOWER(username) = LOWER(${username.trim()})
    `;
    
    // If we found any users with this username, it's not available
    const isAvailable = existingUsers.length === 0;
    
    return res.status(200).json({
      success: true,
      available: isAvailable
    });
  } catch (error) {
    console.error('Error checking username availability:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to check username availability'
    });
  }
} 