import { NextApiRequest, NextApiResponse } from 'next';

/**
 * This endpoint returns an empty leaderboard for testing purposes
 */
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return an empty leaderboard
    return res.status(200).json({
      leaderboard: [],
      source: 'test-endpoint',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test leaderboard error:', error);
    
    // Return empty array with error
    return res.status(500).json({
      leaderboard: [],
      source: 'test-endpoint-error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 