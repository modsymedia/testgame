import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/clientPromise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Check the database connection
    try {
      // Get the SQLite client
      const client = await clientPromise;
      
      return res.status(200).json({
        status: 'ok',
        message: 'SQLite database connected',
        timestamp: new Date().toISOString(),
      });
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      
      return res.status(503).json({
        status: 'error',
        message: 'Database connection failed',
        error: dbError instanceof Error ? dbError.message : String(dbError),
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('API status critical error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
} 