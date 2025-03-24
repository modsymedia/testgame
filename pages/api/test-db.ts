import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check if MongoDB URI is missing or using placeholder
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('username:password')) {
      return res.status(200).json({ 
        status: 'warning',
        message: 'MongoDB not properly configured',
        mock: true,
        diagnostics: {
          hasConnectionString: !!process.env.MONGODB_URI,
          isPlaceholder: process.env.MONGODB_URI ? process.env.MONGODB_URI.includes('username:password') : false,
          recommended: 'Please update your .env.local file with a valid MongoDB connection string'
        }
      });
    }
    
    const client = await clientPromise;
    const db = client.db('Cluster0');
    
    // Test connection by checking the collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c: any) => c.name);
    
    return res.status(200).json({ 
      status: 'connected',
      database: 'Cluster0',
      collections: collectionNames,
      message: 'Database connection successful!',
      connectionString: process.env.MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@')
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Failed to connect to the database',
      error: error instanceof Error ? error.message : String(error),
      tips: [
        'Make sure your MongoDB connection string is correct',
        'Verify that your MongoDB cluster is running',
        'Check if your IP address is whitelisted in MongoDB Atlas',
        'Ensure you\'ve created the database and have proper permissions'
      ]
    });
  }
} 