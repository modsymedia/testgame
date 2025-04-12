import { NextApiRequest, NextApiResponse } from 'next';
import { initDatabase } from '../../lib/database-schema';

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey } = req.body;
  
  // Simple security check - in production, use proper API key validation
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting database initialization...');
    const result = await initDatabase();
    
    if (result) {
      console.log('Database initialization completed successfully');
      return res.status(200).json({ success: true, message: 'Database initialized successfully' });
    } else {
      console.error('Database initialization failed');
      return res.status(500).json({ success: false, error: 'Database initialization failed' });
    }
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Database initialization error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 