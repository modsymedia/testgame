import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

interface StatusResponse {
  api: {
    status: string;
    timestamp: string;
  };
  mongodb: {
    status: string;
    configured: boolean;
    connection: string | null;
    timestamp: string;
  };
  env: {
    nodeEnv: string;
    hasMongoURI: boolean;
    port: string;
  };
  services: {
    leaderboard: {
      status: string;
      mode: string;
      userCount?: number;
    };
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(200).json({ error: 'Method not allowed', status: 'warning' });
  }

  const status: StatusResponse = {
    api: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    },
    mongodb: {
      status: 'unknown',
      configured: false,
      connection: null,
      timestamp: new Date().toISOString()
    },
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      hasMongoURI: !!process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('username:password'),
      port: process.env.PORT || '3001'
    },
    services: {
      leaderboard: {
        status: 'available',
        mode: 'mock'
      }
    }
  };

  // Check MongoDB connection if configured
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('username:password')) {
    status.mongodb.configured = true;

    try {
      const client = await clientPromise;
      const db = client.db('Cluster0');
      const collections = await db.listCollections().toArray();
      
      status.mongodb.status = 'connected';
      status.mongodb.connection = 'successful';
      status.services.leaderboard.mode = 'database';
      
      // Get count of users if users collection exists
      if (collections.some(c => c.name === 'users')) {
        const count = await db.collection('users').countDocuments();
        status.services.leaderboard.userCount = count;
      }
    } catch (error) {
      status.mongodb.status = 'error';
      status.mongodb.connection = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  return res.status(200).json(status);
} 